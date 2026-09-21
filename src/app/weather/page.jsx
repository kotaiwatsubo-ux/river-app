import Link from "next/link";

function getRiverUrl(minutesAgo = 10, stationId = "0691300400087"){
  const now = new Date(Date.now() - minutesAgo * 60 * 1000);
  now.setMinutes(Math.floor(now.getMinutes() / 10) * 10);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2,"0");
  const dd = String(now.getDate()).padStart(2,"0");
  const hh = String(now.getHours()).padStart(2,"0");
  const min = String(now.getMinutes()).padStart(2,"0");
  return `https://www.river.go.jp/kawabou/file/files/tmlist/stg/${yyyy}${mm}${dd}/${hh}${min}/${stationId}.json`;
}
export default async function App(){
  const url = getRiverUrl();
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  const sortedData = data && data.min10Values ? data.min10Values.filter(item => item.stg !== null) : [];
  const Todaytime = sortedData[0]?.obsTime;
  const TodayData = sortedData[0]?.stg;
  const tentime = sortedData[1]?.obsTime;
  const tenData = sortedData[1]?.stg;
  let everyData = "現在の水位:不明";
  if(TodayData >= 0.06 && TodayData<=0.11){
    everyData="現在の水位:平常";
  }
  else{
    everyData="現在の水位:非常";
  }
  return(
    <div style = {{padding:"100px",fontFamily:"sans-serif"}}>
      <h1 style = {{fontSize: "40px",marginBottom: "32px"}}>
        大正川の水位
      </h1>
      <div style = {{display:"flex",gap:"32px"}}>
        {[
          {label: "最新",time: Todaytime,data: TodayData,everyD: ""},
          {label: "10分前",time: tentime,data: tenData,everyD: ""},
          {label: "普段の水位",time:"",data: "0.07~0.10",everyD: everyData}
        ].map((item,index) =>(
          <div
            key = {index}
            style = {{
              border:"2px solid #ccc",
              padding:"32px",
              borderRadius:"16px",
              width:"360px",
            }}
          >
            <span style = {{fontSize:"24px",color: "#666",fontWeight:"bold"}}>
              {item.label}
            </span>
            <h2 style = {{fontSize: "28px",margin:"8px 0 16px 0",color:"#666"}}>
              {item.time}
            </h2>
            <p style = {{fontSize:"40px",fontWeight:"bold",margin:0}}>
              {item.data} m
            </p>
            <p style = {{fontSize:"30px",margin:0}}>
              {item.everyD}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
//H1 = 平常水位 + 0.0021670659081972983 + 0.796964472714416 ×現在の平常水位との差
//+ 0.038906975378939695 ×過去0〜10分雨量
//+ 0.04252171082042963 ×過去10〜30分雨量
//+ 0.022506063205268247 ×過去30〜60分雨量
//+ 0.03281771424584741 ×未来0〜10分雨量
//+ 0.01898072775915218 ×未来10〜30分雨量
//+ 0.0037802011545548975 ×未来30〜60分雨量