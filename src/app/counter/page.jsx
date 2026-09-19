'use client';

import { useState } from "react";
import Link from "next/link";
export default function CounterPage(){
  const [count, setCount]=useState(0);
  const handlePlus =()=>{
    setCount(count+1);
  };
  const handleMinus =()=>{
    setCount(count-1);
  };
  return (
    <div className="counter-container">
      <div className="button-group">
        <button onClick={handlePlus} className="btn-count">
          増やす
        </button>
        <button onClick={handleMinus} className="btn-count">
          減らす
        </button>
      </div>
      <div className="counter-text">
        今の回数：{count}
      </div>
      <div style={{ marginTop:'24px',borderTop:'1px solid #e5e7eb',paddingTop:'16px' }}>
        <Link href="/" style={{fontSize:'21px',color: '#6b7280',textDecoration:'underline'}}>
          メニューに戻る
        </Link>
      </div>
    </div>
  );
}
