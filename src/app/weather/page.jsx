import Link from "next/link";
const OSAKA_CODE = "270000";
const API_URL = `https://www.jma.go.jp/bosai/forecast/data/forecast/${OSAKA_CODE}.json`;
const getWeatherIcon=(weatherText) =>{
  if(!weatherText){
    return ' ';
  }
  return 'https://www.jma.go.jp/bosai/forecast/img/${weatherCode}.svg';
};
async function fetchApiData() {
  const res = await fetch(API_URL,{ next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Status: ${res.status}`);
  }
  return res.json();
}
export default async function ApiPage() {
  const data = await fetchApiData();
  const D0 = data[0];
  const D1 = data[1];
  const timeDefines = D0.timeSeries[0].timeDefines;
  const weathers = D0.timeSeries[0].areas[0].weathers;
  return (
    <div style = {{padding:"24px",fontFamily:"sans-serif"}}>
      <h1 style = {{fontSize:"20px",marginBottom:"16px"}}>
        大阪府の天気予報
      </h1>
      <div style = {{display:"flex",gap:"16px"}}>
        {timeDefines.map((time,index)=>{
          const date = new Date(time).toLocaleDateString("ja-JP",{
            month:"short",
            day:"numeric",
            weekday:"short",
          });
          return (
            <div key={time} style={{ border:"1px solid #ccc",padding:"16px",borderRadius:"8px",width:"180px"}}>
              <h2 style={{fontSize:"14px",margin:"0 0 8px 0",color:"#666" }}>
                {date}
              </h2>
              <p style={{ fontSize:"16px",fontWeight:"bold",margin:0}}>
                {weathers[index]}
              </p>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:'24px',borderTop:'1px solid #e5e7eb',paddingTop:'16px'}}>
        <Link href="/" style={{fontSize:'14px',color: '#6b7280',textDecoration:'underline'}}>
          メニューに戻る
        </Link>
      </div>
    </div>
  );
}

