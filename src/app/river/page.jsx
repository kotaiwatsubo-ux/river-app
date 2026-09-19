// src/app/river/page.jsx

// 月ごとの平常水位 (1月〜12月)
const BASE_WATER_LEVELS = {
  1: 0.130, 2: 0.120, 3: 0.150, 4: 0.210,
  5: 0.150, 6: 0.220, 7: 0.180, 8: 0.180,
  9: 0.210, 10: 0.210, 11: 0.170, 12: 0.150,
};

// ① 現在の大正川の水位を取得する関数（お持ちのコードをここに入れます）
async function fetchCurrentWaterLevel() {
  try {
    return 0.15; // ※仮の水位
  } catch (error) {
    console.error("水位取得エラー:", error);
    return 0.15;
  }
}

// ② Yahoo! 気象情報APIから雨量データを取得する関数
async function fetchRainfallData(lat, lon) {
  const appId = process.env.YAHOO_CLIENT_ID;
  if (!appId) throw new Error("YAHOO_CLIENT_ID が設定されていません。");

  const url = `https://map.yahooapis.jp/weather/V1/place?coordinates=${lon},${lat}&appid=${appId}&output=json&past=1&interval=10`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("APIからのデータ取得に失敗しました");
  const json = await res.json();
  
  return json.Feature?.[0]?.Property?.WeatherList?.Weather || [];
}

// ③ 1時間後予測式 (H1)
function calculateH1(hBase, deltaH, r0_10, r10_30, r30_60, rw0_10, rw10_30, rw30_60) {
  return (
    hBase + 0.0021670659081972983 + 0.796964472714416 * deltaH +
    0.038906975378939695 * r0_10 + 0.04252171082042963 * r10_30 +
    0.022506063205268247 * r30_60 + 0.03281771424584741 * rw0_10 +
    0.01898072775915218 * rw10_30 + 0.0037802011545548975 * rw30_60
  );
}

// ④ 2時間後予測式 (H2)
function calculateH2(hBase, deltaH, r0_10, r10_30, r30_60, rw0_10, rw10_30, rw30_60, rw60_120) {
  return (
    hBase + 0.003851836716227421 + 0.627462712944755 * deltaH +
    0.0371336067425963 * r0_10 + 0.034530856416253745 * r10_30 +
    0.019049245698440406 * r30_60 + 0.037672341267066964 * rw0_10 +
    0.03939418630814206 * rw10_30 + 0.047267318080891726 * rw30_60 +
    0.013812983663448842 * rw60_120
  );
}

export default async function RiverPage() {
  // 大正川沿いの座標設定
  // 茨木市側（大正川上流域）: 北緯 34.805, 東経 135.565
  // 摂津市側（大正川下流域・水位観測所付近）: 北緯 34.775, 東経 135.555
  const ibaLat = 34.805; const ibaLon = 135.565;
  const setLat = 34.775; const setLon = 135.555;

  let currentWaterLevel = 0;
  let h1 = 0, h2 = 0;
  let hBase = 0;
  let rainSummary = {};
  let errorData = null;

  try {
    currentWaterLevel = await fetchCurrentWaterLevel();

    // 茨木・摂津の大正川地点の雨量データ取得
    const weatherIba = await fetchRainfallData(ibaLat, ibaLon);
    const weatherSet = await fetchRainfallData(setLat, setLon);

    const pastIba = weatherIba.filter(item => item.Type === "observation");
    const forecastIba = weatherIba.filter(item => item.Type === "forecast");
    const forecastSet = weatherSet.filter(item => item.Type === "forecast");

    // 降雨強度(mm/h) -> 10分間の降水量(mm) に換算 (÷6)
    const getRain = (list, index) => (list[index]?.Rainfall || 0) / 6.0;

    // --- 雨量集計 (仕分けルール適用) ---
    // 過去〜未来30分: 茨木市（上流） / 未来30分以降: 摂津市（下流）
    const len = pastIba.length;
    const r0_10   = getRain(pastIba, len - 1);
    const r10_30  = getRain(pastIba, len - 2) + getRain(pastIba, len - 3);
    const r30_60  = getRain(pastIba, len - 4) + getRain(pastIba, len - 5) + getRain(pastIba, len - 6);

    const rw0_10  = getRain(forecastIba, 0);
    const rw10_30 = getRain(forecastIba, 1) + getRain(forecastIba, 2);
    const rw30_60 = getRain(forecastSet, 3) + getRain(forecastSet, 4) + getRain(forecastSet, 5);

    let rw60_120 = 0;
    for (let i = 6; i <= 11; i++) {
      rw60_120 += getRain(forecastSet, i);
    }

    // 表示確認用オブジェクトに格納
    rainSummary = {
      r0_10: r0_10.toFixed(3),
      r10_30: r10_30.toFixed(3),
      r30_60: r30_60.toFixed(3),
      rw0_10: rw0_10.toFixed(3),
      rw10_30: rw10_30.toFixed(3),
      rw30_60: rw30_60.toFixed(3),
      rw60_120: rw60_120.toFixed(3),
    };

    // 平常水位と予測の計算
    const currentMonth = new Date().getMonth() + 1;
    hBase = BASE_WATER_LEVELS[currentMonth] || 0.15;
    const deltaH = currentWaterLevel - hBase;

    h1 = calculateH1(hBase, deltaH, r0_10, r10_30, r30_60, rw0_10, rw10_30, rw30_60);
    h2 = calculateH2(hBase, deltaH, r0_10, r10_30, r30_60, rw0_10, rw10_30, rw30_60, rw60_120);

  } catch (err) {
    errorData = err.message;
  }

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <h1>大正川 水位予測システム</h1>

      {errorData ? (
        <p style={{ color: "red", fontWeight: "bold" }}>エラーが発生しました: {errorData}</p>
      ) : (
        <>
          {/* 水位表示カード */}
          <div style={{ display: "flex", gap: "16px", marginTop: "24px", flexWrap: "wrap" }}>
            <div style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "12px", width: "180px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>平常水位 (hBase)</p>
              <p style={{ fontSize: "28px", fontWeight: "bold", margin: "8px 0 0 0" }}>{hBase.toFixed(2)} m</p>
            </div>

            <div style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "12px", width: "180px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>現在の水位</p>
              <p style={{ fontSize: "28px", fontWeight: "bold", margin: "8px 0 0 0" }}>{currentWaterLevel.toFixed(2)} m</p>
            </div>

            <div style={{ border: "2px solid #2b6cb0", padding: "16px", borderRadius: "12px", width: "180px", backgroundColor: "#ebf8ff" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#2b6cb0" }}>1時間後予測 (H1)</p>
              <p style={{ fontSize: "28px", fontWeight: "bold", margin: "8px 0 0 0", color: "#2b6cb0" }}>{h1.toFixed(3)} m</p>
            </div>

            <div style={{ border: "2px solid #2b6cb0", padding: "16px", borderRadius: "12px", width: "180px", backgroundColor: "#ebf8ff" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#2b6cb0" }}>2時間後予測 (H2)</p>
              <p style={{ fontSize: "28px", fontWeight: "bold", margin: "8px 0 0 0", color: "#2b6cb0" }}>{h2.toFixed(3)} m</p>
            </div>
          </div>

          {/* 計算に使用した降水量データ一覧 */}
          <div style={{ marginTop: "32px", padding: "24px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ marginTop: 0 }}>計算に使用した降水量（mm）</h3>
            
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "8px" }}>変数名</th>
                  <th style={{ padding: "8px" }}>対象時間</th>
                  <th style={{ padding: "8px" }}>取得地点</th>
                  <th style={{ padding: "8px" }}>降水量 (mm)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px" }}><code>r0_10</code></td>
                  <td style={{ padding: "8px" }}>直近0〜10分前</td>
                  <td style={{ padding: "8px" }}>茨木市（上流）</td>
                  <td style={{ padding: "8px", fontWeight: "bold" }}>{rainSummary.r0_10}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px" }}><code>r10_30</code></td>
                  <td style={{ padding: "8px" }}>10〜30分前</td>
                  <td style={{ padding: "8px" }}>茨木市（上流）</td>
                  <td style={{ padding: "8px", fontWeight: "bold" }}>{rainSummary.r10_30}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px" }}><code>r30_60</code></td>
                  <td style={{ padding: "8px" }}>30〜60分前</td>
                  <td style={{ padding: "8px" }}>茨木市（上流）</td>
                  <td style={{ padding: "8px", fontWeight: "bold" }}>{rainSummary.r30_60}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px" }}><code>rw0_10</code></td>
                  <td style={{ padding: "8px" }}>未来0〜10分予測</td>
                  <td style={{ padding: "8px" }}>茨木市（上流）</td>
                  <td style={{ padding: "8px", fontWeight: "bold" }}>{rainSummary.rw0_10}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px" }}><code>rw10_30</code></td>
                  <td style={{ padding: "8px" }}>未来10〜30分予測</td>
                  <td style={{ padding: "8px" }}>茨木市（上流）</td>
                  <td style={{ padding: "8px", fontWeight: "bold" }}>{rainSummary.rw10_30}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px" }}><code>rw30_60</code></td>
                  <td style={{ padding: "8px" }}>未来30〜60分予測</td>
                  <td style={{ padding: "8px" }}>摂津市（下流）</td>
                  <td style={{ padding: "8px", fontWeight: "bold" }}>{rainSummary.rw30_60}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px" }}><code>rw60_120</code></td>
                  <td style={{ padding: "8px" }}>未来60〜120分予測</td>
                  <td style={{ padding: "8px" }}>摂津市（下流）</td>
                  <td style={{ padding: "8px", fontWeight: "bold" }}>{rainSummary.rw60_120}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}