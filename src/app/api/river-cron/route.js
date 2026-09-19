// app/api/river-cron/route.js
import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// Googleスプレッドシートへ書き込む関数
async function saveToGoogleSheet(record) {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  await sheet.addRow(record);
}

// Yahoo APIから気象データを取得
async function fetchRainfallData(lat, lon) {
  const appId = process.env.YAHOO_CLIENT_ID;
  if (!appId) throw new Error("YAHOO_CLIENT_IDが未設定です");

  const url = `https://map.yahooapis.jp/weather/V1/place?coordinates=${lon},${lat}&appid=${appId}&output=json&past=1&interval=10`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Yahoo API取得失敗");
  const json = await res.json();
  return json.Feature?.[0]?.Property?.WeatherList?.Weather || [];
}

// 1時間後予測式 (H1)
function calculateH1(hBase, deltaH, r0_10, r10_30, r30_60, rw0_10, rw10_30, rw30_60) {
  return (
    hBase + 0.0021670659081972983 + 0.796964472714416 * deltaH +
    0.038906975378939695 * r0_10 + 0.04252171082042963 * r10_30 +
    0.022506063205268247 * r30_60 + 0.03281771424584741 * rw0_10 +
    0.01898072775915218 * rw10_30 + 0.0037802011545548975 * rw30_60
  );
}

// 2時間後予測式 (H2)
function calculateH2(hBase, deltaH, r0_10, r10_30, r30_60, rw0_10, rw10_30, rw30_60, rw60_120) {
  return (
    hBase + 0.003851836716227421 + 0.627462712944755 * deltaH +
    0.0371336067425963 * r0_10 + 0.034530856416253745 * r10_30 +
    0.019049245698440406 * r30_60 + 0.037672341267066964 * rw0_10 +
    0.03939418630814206 * rw10_30 + 0.047267318080891726 * rw30_60 +
    0.013812983663448842 * rw60_120
  );
}

export async function GET() {
  try {
    const ibaLat = 34.805; const ibaLon = 135.565; // 茨木市（上流）
    const setLat = 34.775; const setLon = 135.555; // 摂津市（下流）

    // 現在の水位（※実際のお持ちの水位取得/追跡ロジック）
    const currentWaterLevel = 0.15; 
    const hBase = 0.15; // 平常水位

    // Yahoo APIデータ取得
    const weatherIba = await fetchRainfallData(ibaLat, ibaLon);
    const weatherSet = await fetchRainfallData(setLat, setLon);

    // 観測データ（過去〜現在）および予測データ
    const pastIba = weatherIba.filter(item => item.Type === "observation");
    const pastSet = weatherSet.filter(item => item.Type === "observation");
    const forecastIba = weatherIba.filter(item => item.Type === "forecast");
    const forecastSet = weatherSet.filter(item => item.Type === "forecast");

    // ★ スプレッドシート記録用：現在の実際の観測降水量（mm/h）
    const ibaCurrentRain = pastIba[pastIba.length - 1]?.Rainfall || 0;
    const setCurrentRain = pastSet[pastSet.length - 1]?.Rainfall || 0;

    // --- 内部の予測計算用処理 (mm/h → 10分間降水量mmに換算: ÷ 6) ---
    const getRain10m = (list, index) => (list[index]?.Rainfall || 0) / 6.0;
    const len = pastIba.length;

    const r0_10   = getRain10m(pastIba, len - 1);
    const r10_30  = getRain10m(pastIba, len - 2) + getRain10m(pastIba, len - 3);
    const r30_60  = getRain10m(pastIba, len - 4) + getRain10m(pastIba, len - 5) + getRain10m(pastIba, len - 6);

    const rw0_10  = getRain10m(forecastIba, 0);
    const rw10_30 = getRain10m(forecastIba, 1) + getRain10m(forecastIba, 2);
    const rw30_60 = getRain10m(forecastSet, 3) + getRain10m(forecastSet, 4) + getRain10m(forecastSet, 5);

    let rw60_120 = 0;
    for (let i = 6; i <= 11; i++) {
      rw60_120 += getRain10m(forecastSet, i);
    }

    // 水位予測の計算
    const deltaH = currentWaterLevel - hBase;
    const h1 = calculateH1(hBase, deltaH, r0_10, r10_30, r30_60, rw0_10, rw10_30, rw30_60);
    const h2 = calculateH2(hBase, deltaH, r0_10, r10_30, r30_60, rw0_10, rw10_30, rw30_60, rw60_120);

    const now = new Date();
    const timestamp = now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

    // ★ スプレッドシートへ書き込み（加工なしの実際の降水量のみ）
    await saveToGoogleSheet({
      "日時": timestamp,
      "現在の水位(m)": currentWaterLevel.toFixed(2),
      "平常水位(m)": hBase.toFixed(2),
      "1時間後予測水位(m)": h1.toFixed(3),
      "2時間後予測水位(m)": h2.toFixed(3),
      "茨木市_現在降水量(mm/h)": ibaCurrentRain,
      "摂津市_現在降水量(mm/h)": setCurrentRain,
    });

    return NextResponse.json({ success: true, timestamp });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}