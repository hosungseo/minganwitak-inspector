import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const TASK_TYPES=["확인·조사","신고·등록","검사·승인","평가·공시","정보관리","시험관리","보상·지원","심의·추천","제작·공급","교육·훈련","기타"];
const DELEG_TYPES=["법정위탁","지정위탁","일반경쟁계약","제한경쟁계약","수의계약","기타"];
const ORG_TYPES=["공기업","준정부기관","기타공공기관","협회","기업","사업자단체","비영리단체","출연연구원","기타"];
const COST_BEARERS=["위탁기관","수탁기관","이용자","기타"];
const BUDGET_ITEMS=["시설장비유지비(210-09)","일반용역비(210-14)","관리용역비(210-15)","일반연구비(260-01)","정책연구비(260-02)","민간경상보조(320-01)","민간위탁사업비(320-02)","법정민간대행사업비(320-08)","사업출연금(350-02)","금융성기금출연금(350-03)","민간기금출연금(350-04)","연구개발경상경비(360-02)","기타"];
const YN_OPT=["O","X"];
const AUDIT_OPTS=["O (소관부서 직접)","O (감사전담기관)","X"];
const MINISTRIES=["기획재정부","교육부","과학기술정보통신부","통일부","법무부","행정안전부"];
const STATUSES={DRAFT:"작성중",SUBMITTED:"제출완료",RETURNED:"보완요청",CONFIRMED:"확정"};
const ST_COL={DRAFT:"#6b7280",SUBMITTED:"#2563eb",RETURNED:"#dc2626",CONFIRMED:"#059669"};
const PUB_ST={NONE:"미승인",APPROVED:"공개승인",EXPORTED:"내보내기완료"};
const PUB_COL={NONE:"#9ca3af",APPROVED:"#7c3aed",EXPORTED:"#0891b2"};
const SUP_FIELDS=[{key:"hasContract",label:"(22) 계약체결"},{key:"contractDisclosed",label:"(23) 결과공개"},{key:"hasGuideline",label:"(24) 사무처리지침"},{key:"manualApproved",label:"(25) 사무편람"},{key:"auditStatus",label:"(26) 감사실시"},{key:"hasCommittee",label:"(28) 운영위원회"}];
const isFail=(v)=>v==="X"||v==="";
const RESET_KEYS=["costAmount","auditDetail","actionPlan","contractDate"];
const PIE_C=["#2563eb","#059669","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16","#6366f1","#f97316"];

// ── 필드 정의 (공개 관리용) ──
const ALL_FIELDS=[
  {key:"ministry",label:"(1) 부처",group:"위탁기관",defaultPublic:true},
  {key:"department",label:"(2) 담당부서",group:"위탁기관",defaultPublic:true},
  {key:"officer",label:"(3) 담당자",group:"위탁기관",defaultPublic:false,warn:"개인정보"},
  {key:"phone",label:"(4) 연락처",group:"위탁기관",defaultPublic:false,warn:"개인정보"},
  {key:"taskName",label:"(5) 위탁사무명",group:"위탁사무",defaultPublic:true},
  {key:"taskBasis",label:"(6) 사무근거",group:"위탁사무",defaultPublic:true},
  {key:"taskType",label:"(7) 사무유형",group:"위탁사무",defaultPublic:true},
  {key:"delegBasis",label:"(8) 위탁근거",group:"위탁사무",defaultPublic:true},
  {key:"delegType",label:"(9) 위탁형식",group:"위탁사무",defaultPublic:true},
  {key:"firstDate",label:"(10) 최초 위탁시기",group:"위탁사무",defaultPublic:true},
  {key:"contractor",label:"(11) 수탁기관명",group:"수탁기관",defaultPublic:true},
  {key:"contractorType",label:"(12) 수탁기관 유형",group:"수탁기관",defaultPublic:true},
  {key:"contractDate",label:"(13) 수탁시기",group:"수탁기관",defaultPublic:true},
  {key:"costBearer",label:"(14) 비용부담주체",group:"위탁비용",defaultPublic:true},
  {key:"budgetItem",label:"(15) 예산비목",group:"위탁비용",defaultPublic:true},
  {key:"costAmount",label:"(16) 위탁비용 규모",group:"위탁비용",defaultPublic:true},
  {key:"isRedeleg",label:"(17) 재위탁 여부",group:"재위탁",defaultPublic:true},
  {key:"redelegBasis",label:"(18) 재위탁 근거",group:"재위탁",defaultPublic:false},
  {key:"redelegOrg",label:"(19) 재위탁 기관",group:"재위탁",defaultPublic:false},
  {key:"redelegOrgType",label:"(20) 재위탁 기관유형",group:"재위탁",defaultPublic:false},
  {key:"hasContract",label:"(22) 계약체결",group:"관리·감독",defaultPublic:true},
  {key:"contractDisclosed",label:"(23) 결과공개",group:"관리·감독",defaultPublic:true},
  {key:"hasGuideline",label:"(24) 사무처리지침",group:"관리·감독",defaultPublic:true},
  {key:"manualApproved",label:"(25) 사무편람",group:"관리·감독",defaultPublic:true},
  {key:"auditStatus",label:"(26) 감사실시",group:"관리·감독",defaultPublic:true},
  {key:"auditDetail",label:"(27) 감사 주요내용",group:"관리·감독",defaultPublic:false,warn:"내부 지적사항"},
  {key:"hasCommittee",label:"(28) 운영위원회",group:"관리·감독",defaultPublic:true},
  {key:"actionPlan",label:"(29) 조치계획",group:"관리·감독",defaultPublic:false,warn:"내부 행정절차"},
  {key:"remarks",label:"비고",group:"기타",defaultPublic:false,warn:"내부 참고"},
];

const defaultPubFields=()=>{const m={};ALL_FIELDS.forEach(f=>{m[f.key]=f.defaultPublic;});return m;};

function mkSample(yr){
  const base=[
    {sid:"1",ministry:"기획재정부",department:"경제교육사업팀",officer:"송일남 사무관",phone:"044-215-2993",taskName:"경제교육인력양성사업",taskBasis:"경제교육지원법 시행령 제5조",taskType:"교육·훈련",delegBasis:"경제교육지원법 시행령 제8조제1항제2호",delegType:"지정위탁",firstDate:"2013.1.",contractor:"한국개발연구원",contractorType:"출연연구원",costBearer:"위탁기관",budgetItem:"민간위탁사업비(320-02)",isRedeleg:"X",hasContract:"O",contractDisclosed:"O",hasGuideline:"O",manualApproved:"O",auditStatus:"O (소관부서 직접)",hasCommittee:"O",costAmount24:800,contractDate24:"2024.1.4.",auditDetail24:"서면보고",actionPlan24:"",st24:"CONFIRMED"},
    {sid:"2",ministry:"교육부",department:"인재선발제도과",officer:"김성동 연구사",phone:"044-203-6891",taskName:"대학수학능력시험",taskBasis:"고등교육법 제33조, 제34조",taskType:"시험관리",delegBasis:"행정권한의 위임 및 위탁에 관한 규정 제45조제3항제2호",delegType:"법정위탁",firstDate:"1998.3.1.",contractor:"한국교육과정평가원",contractorType:"출연연구원",costBearer:"위탁기관",budgetItem:"민간위탁사업비(320-02)",isRedeleg:"X",hasContract:"O",contractDisclosed:"O",hasGuideline:"O",manualApproved:"O",auditStatus:"O (소관부서 직접)",hasCommittee:"X",costAmount24:33647,contractDate24:"1998.3.1.",auditDetail24:"출제진 선정·검토 점검",actionPlan24:"",st24:"CONFIRMED"},
    {sid:"3",ministry:"행정안전부",department:"조직진단과",officer:"김신일 사무관",phone:"044-205-2326",taskName:"정부인력 기능체계 효율화 사전진단",taskBasis:"조직과 정원에 관한 통칙 제32조제7항",taskType:"확인·조사",delegBasis:"통칙 제32조제7항",delegType:"일반경쟁계약",firstDate:"2018.10.2.",contractor:"한국행정연구원",contractorType:"기타공공기관",costBearer:"위탁기관",budgetItem:"민간위탁사업비(320-02)",isRedeleg:"X",hasContract:"O",contractDisclosed:"O",hasGuideline:"O",manualApproved:"O",auditStatus:"O (소관부서 직접)",hasCommittee:"O",costAmount24:250,contractDate24:"2018.10.2.",auditDetail24:"지적사항 없음",actionPlan24:"",st24:"CONFIRMED"},
    {sid:"4",ministry:"과학기술정보통신부",department:"연구산업진흥과",officer:"장지선 사무관",phone:"044-202-4734",taskName:"기업부설연구소 인정제도 운영",taskBasis:"기초연구진흥법 제14조의2",taskType:"신고·등록",delegBasis:"동법 시행령 제27조",delegType:"법정위탁",firstDate:"1991.2.",contractor:"(사)한국산업기술진흥협회",contractorType:"협회",costBearer:"위탁기관",budgetItem:"사업출연금(350-02)",isRedeleg:"X",hasContract:"O",contractDisclosed:"O",hasGuideline:"O",manualApproved:"O",auditStatus:"O (소관부서 직접)",hasCommittee:"X",costAmount24:3850,contractDate24:"1991.2.",auditDetail24:"지적사항 없음",actionPlan24:"법정위탁 사무로 운영위 불필요",st24:"CONFIRMED"},
    {sid:"5",ministry:"법무부",department:"이민통합과",officer:"박기형 주무관",phone:"02-2110-4150",taskName:"이민자 사회통합프로그램 운영",taskBasis:"출입국관리법 제39조",taskType:"교육·훈련",delegBasis:"출입국관리법 시행령 제48조제4항",delegType:"제한경쟁계약",firstDate:"2009.1.1.",contractor:"건국대학교 등 334개",contractorType:"기타",costBearer:"위탁기관",budgetItem:"민간위탁사업비(320-02)",isRedeleg:"X",hasContract:"O",contractDisclosed:"O",hasGuideline:"O",manualApproved:"O",auditStatus:"O (소관부서 직접)",hasCommittee:"O",costAmount24:10439,contractDate24:"2022.1.1.",auditDetail24:"지출기준 오적용",actionPlan24:"",st24:"RETURNED",rc:"감사 개선조치 결과 보완 필요"},
    {sid:"6",ministry:"통일부",department:"정착지원과",officer:"박형국 사무관",phone:"02-2100-5922",taskName:"북한이탈주민 전문상담사 제도 운영",taskBasis:"북한이탈주민법 제30조",taskType:"기타",delegBasis:"동법 시행령 제49조제4항제3호",delegType:"법정위탁",firstDate:"2011.1.",contractor:"북한이탈주민지원재단",contractorType:"기타공공기관",costBearer:"위탁기관",budgetItem:"사업출연금(350-02)",isRedeleg:"X",hasContract:"X",contractDisclosed:"X",hasGuideline:"O",manualApproved:"O",auditStatus:"O (감사전담기관)",hasCommittee:"O",costAmount24:25384,contractDate24:"2011.1.",auditDetail24:"사업 적정 추진, 예산 집행 적정성",actionPlan24:"계약 체결·공개 검토(25년)",st24:"CONFIRMED"},
    {sid:"7",ministry:"과학기술정보통신부",department:"전파방송관리과",officer:"노인영 사무관",phone:"044-202-4935",taskName:"천리안통신위성 이용기반 구축",taskBasis:"천리안통신위성 운영규정 제7조",taskType:"확인·조사",delegBasis:"천리안통신위성 운영규정",delegType:"법정위탁",firstDate:"2019.1.1.",contractor:"한국전자통신연구원",contractorType:"출연연구원",costBearer:"위탁기관",budgetItem:"민간위탁사업비(320-02)",isRedeleg:"X",hasContract:"O",contractDisclosed:"X",hasGuideline:"O",manualApproved:"O",auditStatus:"X",hasCommittee:"X",costAmount24:1332,contractDate24:"2019.1.1.",auditDetail24:"",actionPlan24:"위탁계약 공개(~25.4월), 감사 실시 예정",st24:"CONFIRMED"},
    {sid:"8",ministry:"행정안전부",department:"승강기정책과",officer:"송상훈 주무관",phone:"044-205-4294",taskName:"승강기 사고조사 위탁사업",taskBasis:"승강기 안전관리법 제48조",taskType:"확인·조사",delegBasis:"승강기 안전관리법 제78조",delegType:"법정위탁",firstDate:"2005.7.1.",contractor:"한국승강기안전공단",contractorType:"준정부기관",costBearer:"위탁기관",budgetItem:"민간위탁사업비(320-02)",isRedeleg:"X",hasContract:"O",contractDisclosed:"O",hasGuideline:"O",manualApproved:"O",auditStatus:"O (소관부서 직접)",hasCommittee:"O",costAmount24:4023,contractDate24:"2005.7.1.",auditDetail24:"지적사항 없음",actionPlan24:"",st24:"CONFIRMED"},
  ];
  const td=new Date().toISOString().slice(0,10);
  return base.map(b=>{
    const is24=yr===2024;
    return{id:yr+"-"+b.sid,year:yr,ministry:b.ministry,department:b.department,officer:b.officer,phone:b.phone,taskName:b.taskName,taskBasis:b.taskBasis,taskType:b.taskType,delegBasis:b.delegBasis,delegType:b.delegType,firstDate:b.firstDate,contractor:b.contractor,contractorType:b.contractorType,contractDate:is24?b.contractDate24:"",costBearer:b.costBearer,budgetItem:b.budgetItem,costAmount:is24?b.costAmount24:"",isRedeleg:b.isRedeleg,redelegBasis:"",redelegOrg:"",redelegOrgType:"",redelegAction:"",hasContract:b.hasContract,contractDisclosed:b.contractDisclosed,hasGuideline:b.hasGuideline,manualApproved:b.manualApproved,auditStatus:b.auditStatus,auditDetail:is24?b.auditDetail24:"",hasCommittee:b.hasCommittee,actionPlan:is24?b.actionPlan24:"",remarks:"",files:[],status:is24?b.st24:"DRAFT",pubStatus:"NONE",pubOverrides:{},updatedAt:is24?"2025-03-15":td,returnComment:is24?(b.rc||""):""};
  });
}

function emptyCase(yr){return{id:Date.now().toString(),year:yr,ministry:"",department:"",officer:"",phone:"",taskName:"",taskBasis:"",taskType:"",delegBasis:"",delegType:"",firstDate:"",contractor:"",contractorType:"",contractDate:"",costBearer:"",budgetItem:"",costAmount:"",isRedeleg:"X",redelegBasis:"",redelegOrg:"",redelegOrgType:"",redelegAction:"",hasContract:"",contractDisclosed:"",hasGuideline:"",manualApproved:"",auditStatus:"",auditDetail:"",hasCommittee:"",actionPlan:"",remarks:"",files:[],status:"DRAFT",pubStatus:"NONE",pubOverrides:{},updatedAt:new Date().toISOString().slice(0,10),returnComment:""};}

const css=`
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans KR',sans-serif;background:#f1f3f7;color:#16192c;font-size:13px}
.app{min-height:100vh;display:flex;flex-direction:column}
.hdr{background:#0f2240;color:#fff;padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:50px;position:sticky;top:0;z-index:100}
.hdr-l{display:flex;align-items:center;gap:10px}
.logo{width:28px;height:28px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800}
.hdr h1{font-size:13px;font-weight:600}
.hdr-r{display:flex;align-items:center;gap:12px}
.yr-sel{font-size:11px;background:rgba(255,255,255,.12);padding:4px 10px;border-radius:5px;display:flex;align-items:center;gap:5px}
.yr-sel select{background:transparent;color:#fff;border:none;font-family:inherit;font-size:11px;font-weight:600;outline:none;cursor:pointer}
.yr-sel select option{color:#000}
.nav{background:#fff;border-bottom:1px solid #dde2ea;display:flex;padding:0 20px;overflow-x:auto}
.ni{padding:10px 16px;font-size:12px;font-weight:500;color:#636d82;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap}
.ni:hover{color:#1d4ed8}.ni.on{color:#1d4ed8;border-bottom-color:#1d4ed8;font-weight:600}
.ct{flex:1;padding:16px 20px;max-width:1440px;width:100%;margin:0 auto}
.btn{font-family:inherit;font-size:11px;font-weight:500;padding:6px 12px;border:none;border-radius:5px;cursor:pointer;transition:all .12s;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.bp{background:#1d4ed8;color:#fff}.bp:hover{background:#1e40af}
.bo{background:#fff;color:#1d4ed8;border:1px solid #1d4ed8}.bo:hover{background:#e0e7ff}
.bg{background:#e5e7eb;color:#374151}.bg:hover{background:#d1d5db}
.bk{background:#059669;color:#fff}.bk:hover{background:#047857}
.br{background:#dc2626;color:#fff}.br:hover{background:#b91c1c}
.bv{background:#7c3aed;color:#fff}.bv:hover{background:#6d28d9}
.bs{padding:4px 8px;font-size:10px}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}
.card{background:#fff;border-radius:9px;box-shadow:0 1px 3px rgba(0,0,0,.05);border:1px solid #dde2ea;padding:20px;margin-bottom:14px}
.chd{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #f0f2f5;flex-wrap:wrap;gap:6px}
.ctt{font-size:14px;font-weight:700}
table{width:100%;border-collapse:collapse}
th{padding:7px 10px;text-align:left;font-weight:600;color:#636d82;font-size:10px;background:#f8f9fc;border-bottom:2px solid #dde2ea;white-space:nowrap}
td{padding:7px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle;font-size:12px}
tbody tr:hover{background:#f8fafd}
.lnk{color:#1d4ed8;font-weight:500;cursor:pointer}.lnk:hover{text-decoration:underline}
.flt{display:flex;gap:5px;flex-wrap:wrap;align-items:center}
.flt select,.flt input{font-family:inherit;font-size:11px;padding:5px 8px;border:1px solid #dde2ea;border-radius:4px;background:#fff;outline:none}
.flt select:focus,.flt input:focus{border-color:#1d4ed8}
.steps{display:flex;gap:1px;margin-bottom:18px;background:#dde2ea;border-radius:7px;overflow:hidden}
.stp{flex:1;text-align:center;padding:8px 3px;font-size:10px;font-weight:500;color:#636d82;background:#f8f9fc;cursor:pointer;white-space:nowrap}
.stp.on{color:#1d4ed8;background:#e0e7ff;font-weight:600}.stp.dn{color:#059669;background:#d1fae5}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fi{display:flex;flex-direction:column;gap:3px}.fi.full{grid-column:1/-1}
.fi label{font-size:10px;font-weight:600;color:#636d82}.fi .rq{color:#dc2626}
.fi input,.fi select,.fi textarea{font-family:inherit;font-size:12px;padding:7px 9px;border:1px solid #dde2ea;border-radius:4px;outline:none;width:100%}
.fi input:focus,.fi select:focus,.fi textarea:focus{border-color:#1d4ed8}
.fi textarea{resize:vertical;min-height:60px}
.fi input:disabled,.fi select:disabled,.fi textarea:disabled{background:#f3f4f6;color:#9ca3af}
.fi .ht{font-size:9px;color:#9ca3af}
.chg{background:#fefce8!important;border-left:3px solid #eab308!important;padding-left:7px}
.dg{display:grid;grid-template-columns:130px 1fr 130px 1fr;gap:0;border:1px solid #dde2ea;border-radius:7px;overflow:hidden}
.dg .dt{padding:8px 10px;background:#f8f9fc;font-weight:600;color:#636d82;font-size:11px;border-bottom:1px solid #f0f2f5}
.dg .dd{padding:8px 10px;font-size:12px;border-bottom:1px solid #f0f2f5}
.sec{font-size:12px;font-weight:700;color:#0f2240;margin:14px 0 6px;padding-left:8px;border-left:3px solid #1d4ed8}
.toast{position:fixed;bottom:18px;right:18px;background:#1e293b;color:#fff;padding:9px 16px;border-radius:6px;font-size:11px;font-weight:500;z-index:999;animation:su .25s ease}
@keyframes su{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.al{border-radius:7px;padding:10px 12px;margin-bottom:12px;font-size:11px}
.aw{background:#fef3c7;border:1px solid #fcd34d;color:#92400e}
.ai{background:#eff6ff;border:1px solid #93c5fd;color:#1e40af}
.ap{background:#f3e8ff;border:1px solid #c084fc;color:#6b21a8}
.sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:7px;margin-bottom:14px}
.sc{border-radius:7px;padding:9px 12px;border:1px solid transparent}
.sc .sv{font-size:20px;font-weight:800;line-height:1.1}.sc .sl{font-size:9px;font-weight:600;margin-bottom:1px}
.fl{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
.fc{display:flex;align-items:center;gap:3px;background:#f1f5f9;border:1px solid #e2e8f0;padding:2px 7px;border-radius:4px;font-size:10px;color:#636d82}
.fx{cursor:pointer;color:#94a3b8;font-weight:700;margin-left:2px}.fx:hover{color:#dc2626}
.mask{color:#d1d5db;font-style:italic;font-size:11px}
.toggle{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;padding:4px 0}
.toggle-sw{width:34px;height:18px;border-radius:9px;position:relative;transition:background .2s}
.toggle-sw::after{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.15)}
.toggle-sw.on{background:#1d4ed8}.toggle-sw.on::after{transform:translateX(16px)}
.toggle-sw.off{background:#d1d5db}
.pub-preview{background:#f8f9fc;border:2px dashed #c084fc;border-radius:8px;padding:16px;margin-top:10px}
.pub-preview .sec{border-left-color:#7c3aed}
/* --- frontpage refinement inspired by styleseed / impeccable / design-md --- */
body{
  background:
    radial-gradient(circle at top left, rgba(59,130,246,.08), transparent 32%),
    radial-gradient(circle at top right, rgba(20,184,166,.06), transparent 28%),
    #f4f7fb;
  color:#0f172a;
  letter-spacing:-.01em;
}
.hdr{
  height:68px;
  padding:0 26px;
  background:rgba(11,18,32,.86);
  border-bottom:1px solid rgba(255,255,255,.08);
  backdrop-filter:blur(16px);
}
.logo{
  width:34px;height:34px;border-radius:10px;
  background:linear-gradient(135deg,#2563eb,#14b8a6);
  box-shadow:0 12px 28px rgba(37,99,235,.18);
}
.brand-block{display:flex;flex-direction:column;gap:2px}
.brand-kicker{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.54);font-weight:700}
.hdr h1{font-size:15px;font-weight:700;letter-spacing:-.02em}
.user-chip{font-size:11px;opacity:.9;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.06)}
.nav{background:transparent;border-bottom:none;padding:12px 24px 0;gap:8px}
.ni{
  padding:9px 14px;
  border-radius:999px;
  border:1px solid rgba(148,163,184,.22);
  background:rgba(255,255,255,.58);
  box-shadow:0 1px 1px rgba(15,23,42,.02);
  font-size:12px;
}
.ni:hover{color:#0f172a;border-color:rgba(37,99,235,.2);background:#fff}
.ni.on{color:#0f172a;border-bottom-color:transparent;border-color:rgba(15,23,42,.08);background:#fff;box-shadow:0 10px 24px rgba(15,23,42,.06);font-weight:700}
.ct{padding:22px 24px 28px;max-width:1480px}
.card{
  border:1px solid rgba(203,213,225,.7);
  box-shadow:0 16px 42px rgba(15,23,42,.06);
  background:rgba(255,255,255,.78);
  backdrop-filter:blur(10px);
  border-radius:18px;
}
.chd{padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid rgba(226,232,240,.8)}
.ctt{font-size:15px;letter-spacing:-.02em}
.card-meta{font-size:11px;color:#64748b}
.tbl-w{overflow:auto;border-radius:14px}
th{background:#f8fafc;color:#475569;font-size:10px;padding:10px 12px}
td{padding:11px 12px;font-size:12px}
tbody tr:hover{background:#f8fbff}
.flt select,.flt input{
  border-radius:999px;
  padding:8px 12px;
  border:1px solid rgba(203,213,225,.9);
  background:rgba(255,255,255,.92);
}
.flt select:focus,.flt input:focus{box-shadow:0 0 0 4px rgba(37,99,235,.08)}
.sg.summary-strip{gap:10px;margin-bottom:18px}
.sc{padding:12px 14px;border-radius:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.7)}
.sc .sl{font-size:10px;letter-spacing:.04em;text-transform:uppercase}
.sc .sv{font-size:24px;letter-spacing:-.03em}
.workspace-hero{
  display:grid;
  grid-template-columns:minmax(0,1.7fr) minmax(320px,.9fr);
  gap:18px;
  margin-bottom:18px;
  padding:24px 26px;
  border-radius:24px;
  background:
    linear-gradient(135deg, rgba(255,255,255,.86), rgba(248,250,252,.94)),
    radial-gradient(circle at 0% 0%, rgba(59,130,246,.08), transparent 26%);
  border:1px solid rgba(226,232,240,.9);
  box-shadow:0 20px 50px rgba(15,23,42,.08);
}
.workspace-hero-copy h2{font-size:31px;line-height:1.1;letter-spacing:-.045em;max-width:18ch;margin-bottom:10px}
.workspace-hero-copy p{font-size:14px;line-height:1.7;color:#475569;max-width:66ch}
.hero-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#2563eb;font-weight:800;margin-bottom:10px}
.hero-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.hero-tag{padding:7px 10px;border-radius:999px;background:#fff;border:1px solid rgba(37,99,235,.12);font-size:11px;font-weight:600;color:#334155}
.workspace-hero-side{
  border-radius:20px;
  padding:18px;
  background:linear-gradient(180deg,#0f172a,#111827);
  color:#fff;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  min-height:220px;
}
.hero-side-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.58);font-weight:700}
.hero-side-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}
.hero-side-grid div{padding:12px 0;border-top:1px solid rgba(255,255,255,.08)}
.hero-side-grid span{display:block;font-size:11px;color:rgba(255,255,255,.58);margin-bottom:6px}
.hero-side-grid strong{display:block;font-size:32px;letter-spacing:-.05em;line-height:1;font-weight:800}
.hero-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.hero-actions .btn{padding:8px 12px;font-size:11px}
.workspace-table-card{padding-top:18px}
.filter-strip{justify-content:space-between}
.filter-strip input{flex:1;min-width:220px;max-width:320px}
.btn{
  border-radius:999px;
  padding:7px 13px;
  font-weight:600;
}
.bp{box-shadow:0 10px 24px rgba(37,99,235,.16)}
.bo{background:rgba(255,255,255,.9)}
@media(max-width:980px){
  .workspace-hero{grid-template-columns:1fr}
  .workspace-hero-copy h2{max-width:none;font-size:28px}
}
@media(max-width:768px){
  .fg{grid-template-columns:1fr}
  .dg{grid-template-columns:100px 1fr}
  .sg{grid-template-columns:repeat(2,1fr)}
  .hdr{padding:0 16px;height:62px}
  .brand-kicker{display:none}
  .hdr h1{font-size:13px}
  .nav{padding:10px 16px 0}
  .ct{padding:18px 16px 24px}
  .workspace-hero{padding:20px 18px;border-radius:20px}
  .workspace-hero-copy h2{font-size:24px}
  .workspace-hero-copy p{font-size:13px}
  .hero-side-grid strong{font-size:26px}
}
`;

// ── Shared form components ──
function Sel({label,field,options,required,disabled,hint,value,onChange,changed,prevVal}){
  return(<div className={"fi"+(changed?" chg":"")}><label>{label} {required&&<span className="rq">*</span>}</label><select value={value||""} onChange={e=>onChange(field,e.target.value)} disabled={disabled}><option value="">선택</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>{hint&&<div className="ht">{hint}</div>}{changed&&<div className="ht" style={{color:"#ca8a04"}}>전년: {prevVal||"(없음)"}</div>}</div>);
}
function Inp({label,field,required,placeholder,disabled,type,hint,full,value,onChange,changed,prevVal}){
  return(<div className={"fi"+(full?" full":"")+(changed?" chg":"")}><label>{label} {required&&<span className="rq">*</span>}</label><input type={type||"text"} value={value||""} onChange={e=>onChange(field,e.target.value)} placeholder={placeholder} disabled={disabled}/>{hint&&<div className="ht">{hint}</div>}{changed&&<div className="ht" style={{color:"#ca8a04"}}>전년: {prevVal||"(없음)"}</div>}</div>);
}
function Txt({label,field,required,placeholder,hint,full,disabled,value,onChange,changed,prevVal}){
  return(<div className={"fi"+(full?" full":"")+(changed?" chg":"")}><label>{label} {required&&<span className="rq">*</span>}</label><textarea value={value||""} onChange={e=>onChange(field,e.target.value)} placeholder={placeholder} disabled={disabled}/>{hint&&<div className="ht">{hint}</div>}{changed&&<div className="ht" style={{color:"#ca8a04"}}>전년: {prevVal||"(없음)"}</div>}</div>);
}

// ── Form Steps ──
function Step0({c,u,ch,pv}){return <div className="fg"><Sel label="(1) 부처" field="ministry" options={MINISTRIES} required value={c.ministry} onChange={u} changed={ch("ministry")} prevVal={pv("ministry")}/><Inp label="(2) 담당부서" field="department" required placeholder="예: 경제교육사업팀" value={c.department} onChange={u} changed={ch("department")} prevVal={pv("department")}/><Inp label="(3) 담당자" field="officer" required placeholder="예: 홍길동 사무관" value={c.officer} onChange={u} changed={ch("officer")} prevVal={pv("officer")}/><Inp label="(4) 연락처" field="phone" required placeholder="044-215-2993" value={c.phone} onChange={u} changed={ch("phone")} prevVal={pv("phone")}/></div>;}
function Step1({c,u,ch,pv}){return <div className="fg"><Inp label="(5) 위탁사무명" field="taskName" required placeholder="사무명" full value={c.taskName} onChange={u} changed={ch("taskName")} prevVal={pv("taskName")}/><Txt label="(6) 사무근거" field="taskBasis" required value={c.taskBasis} onChange={u} changed={ch("taskBasis")} prevVal={pv("taskBasis")}/><Sel label="(7) 사무유형" field="taskType" options={TASK_TYPES} required value={c.taskType} onChange={u} changed={ch("taskType")} prevVal={pv("taskType")}/><Txt label="(8) 위탁근거" field="delegBasis" required full value={c.delegBasis} onChange={u} changed={ch("delegBasis")} prevVal={pv("delegBasis")}/><Sel label="(9) 위탁형식" field="delegType" options={DELEG_TYPES} required value={c.delegType} onChange={u} changed={ch("delegType")} prevVal={pv("delegType")}/><Inp label="(10) 최초 위탁시기" field="firstDate" required placeholder="2013.1." value={c.firstDate} onChange={u} changed={ch("firstDate")} prevVal={pv("firstDate")}/></div>;}
function Step2({c,u,ch,pv}){return <div className="fg"><Inp label="(11) 수탁기관명" field="contractor" required value={c.contractor} onChange={u} changed={ch("contractor")} prevVal={pv("contractor")}/><Sel label="(12) 수탁기관 유형" field="contractorType" options={ORG_TYPES} required value={c.contractorType} onChange={u} changed={ch("contractorType")} prevVal={pv("contractorType")}/><Inp label="(13) 수탁시기" field="contractDate" required full value={c.contractDate} onChange={u} changed={ch("contractDate")} prevVal={pv("contractDate")}/></div>;}
function Step3({c,u,ch,pv}){return <div className="fg"><Sel label="(14) 부담주체" field="costBearer" options={COST_BEARERS} required value={c.costBearer} onChange={u} changed={ch("costBearer")} prevVal={pv("costBearer")}/><Sel label="(15) 예산비목" field="budgetItem" options={BUDGET_ITEMS} required={c.costBearer==="위탁기관"} disabled={c.costBearer!=="위탁기관"} value={c.budgetItem} onChange={u} changed={ch("budgetItem")} prevVal={pv("budgetItem")}/><Inp label="(16) 위탁비용 규모" field="costAmount" type="number" placeholder="백만원" value={c.costAmount} onChange={u} changed={ch("costAmount")} prevVal={pv("costAmount")}/></div>;}
function Step4({c,u,ch,pv}){const d=c.isRedeleg!=="O";return <div className="fg"><Sel label="(17) 재위탁 여부" field="isRedeleg" options={YN_OPT} required value={c.isRedeleg} onChange={u} changed={ch("isRedeleg")} prevVal={pv("isRedeleg")}/><div className="fi"/><Txt label="(18) 재위탁 근거" field="redelegBasis" disabled={d} value={c.redelegBasis} onChange={u}/><Inp label="(19) 재위탁 기관명" field="redelegOrg" disabled={d} value={c.redelegOrg} onChange={u}/><Sel label="(20) 기관유형" field="redelegOrgType" options={ORG_TYPES} disabled={d} value={c.redelegOrgType} onChange={u}/><Txt label="(21) 조치계획" field="redelegAction" disabled={d} value={c.redelegAction} onChange={u}/></div>;}
function Step5({c,u,ch,pv}){return <div className="fg"><Sel label="(22) 계약체결" field="hasContract" options={YN_OPT} required value={c.hasContract} onChange={u} changed={ch("hasContract")} prevVal={pv("hasContract")}/><Sel label="(23) 결과공개" field="contractDisclosed" options={YN_OPT} required value={c.contractDisclosed} onChange={u} changed={ch("contractDisclosed")} prevVal={pv("contractDisclosed")}/><Sel label="(24) 사무처리지침" field="hasGuideline" options={YN_OPT} required value={c.hasGuideline} onChange={u} changed={ch("hasGuideline")} prevVal={pv("hasGuideline")}/><Sel label="(25) 사무편람" field="manualApproved" options={YN_OPT} required value={c.manualApproved} onChange={u} changed={ch("manualApproved")} prevVal={pv("manualApproved")}/><Sel label="(26) 감사실시" field="auditStatus" options={AUDIT_OPTS} required value={c.auditStatus} onChange={u} changed={ch("auditStatus")} prevVal={pv("auditStatus")}/><Txt label="(27) 감사내용" field="auditDetail" disabled={c.auditStatus==="X"} value={c.auditDetail} onChange={u} changed={ch("auditDetail")} prevVal={pv("auditDetail")}/><Sel label="(28) 운영위원회" field="hasCommittee" options={YN_OPT} required value={c.hasCommittee} onChange={u} changed={ch("hasCommittee")} prevVal={pv("hasCommittee")}/><Txt label="(29) 조치계획" field="actionPlan" value={c.actionPlan} onChange={u} changed={ch("actionPlan")} prevVal={pv("actionPlan")}/><Txt label="비고" field="remarks" full value={c.remarks} onChange={u}/></div>;}
function Step6({c,u}){
  const addFile=()=>{const n=["위탁계약서.pdf","감사보고서.hwp","사무편람.pdf"][Math.floor(Math.random()*3)];u("files",[...(c.files||[]),n]);};
  return <div>
    <div style={{marginBottom:14}}><div style={{fontWeight:600,marginBottom:6,fontSize:12}}>📎 첨부파일</div><button className="btn bs bo" onClick={addFile}>+ 파일 첨부 (데모)</button><div className="fl" style={{marginTop:6}}>{(c.files||[]).map((f,i)=><div key={i} className="fc">📎 {f}<span className="fx" onClick={()=>u("files",(c.files||[]).filter((_,j)=>j!==i))}>×</span></div>)}{!(c.files||[]).length&&<span style={{fontSize:10,color:"#9ca3af"}}>없음</span>}</div></div>
    <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,padding:12}}><div style={{fontWeight:600,color:"#166534",marginBottom:6,fontSize:12}}>📋 입력 요약</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 18px",fontSize:11}}>{[["부처",c.ministry],["담당자",c.officer],["위탁사무명",c.taskName],["수탁기관",c.contractor],["위탁비용",c.costAmount?Number(c.costAmount).toLocaleString()+"백만원":"-"],["위탁형식",c.delegType],["계약체결",c.hasContract],["감사실시",c.auditStatus],["운영위원회",c.hasCommittee],["첨부",`${(c.files||[]).length}건`]].map(([k,v])=><div key={k}><span style={{color:"#6b7280"}}>{k}: </span><strong>{v||<span style={{color:"#d1d5db"}}>미입력</span>}</strong></div>)}</div></div>
  </div>;
}

// ── FormView ──
function FormView({c:init,prev,onSave,onBack}){
  const[c,setC]=useState({...init});const[step,setStep]=useState(0);
  const u=(f,v)=>setC(p=>({...p,[f]:v}));
  const ch=(field)=>prev&&prev[field]!==undefined&&c[field]!==""&&String(c[field])!==String(prev[field]);
  const pv=(field)=>prev?String(prev[field]||""):"";
  const sn=["위탁기관","위탁사무","수탁기관","위탁비용","재위탁","관리·감독","첨부·확인"];
  const sc=[<Step0 key={0} c={c} u={u} ch={ch} pv={pv}/>,<Step1 key={1} c={c} u={u} ch={ch} pv={pv}/>,<Step2 key={2} c={c} u={u} ch={ch} pv={pv}/>,<Step3 key={3} c={c} u={u} ch={ch} pv={pv}/>,<Step4 key={4} c={c} u={u} ch={ch} pv={pv}/>,<Step5 key={5} c={c} u={u} ch={ch} pv={pv}/>,<Step6 key={6} c={c} u={u}/>];
  return <div className="card">
    <div className="chd"><div style={{display:"flex",alignItems:"center",gap:8}}><button className="btn bs bg" onClick={onBack}>← 목록</button><span className="ctt">{c.taskName||"신규 등록"}</span></div></div>
    {c.returnComment&&<div className="al aw">⚠ 보완요청: {c.returnComment}</div>}
    {prev&&<div className="al ai">💡 전년도 이월 건. <span style={{background:"#fefce8",padding:"0 4px",borderLeft:"2px solid #eab308",fontSize:10}}>노란색</span> = 변경항목</div>}
    <div className="steps">{sn.map((s,i)=><div key={i} className={"stp"+(i===step?" on":"")+(i<step?" dn":"")} onClick={()=>setStep(i)}>{i<step?"✓ ":(i+1)+". "}{s}</div>)}</div>
    {sc[step]}
    <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:18,paddingTop:12,borderTop:"1px solid #f0f2f5"}}>
      {step>0&&<button className="btn bg" onClick={()=>setStep(step-1)}>← 이전</button>}<div style={{flex:1}}/>
      <button className="btn bo" onClick={()=>onSave(c,false)}>임시저장</button>
      {step<sn.length-1?<button className="btn bp" onClick={()=>setStep(step+1)}>다음 →</button>:<button className="btn bk" onClick={()=>onSave(c,true)}>제출</button>}
    </div>
  </div>;
}

// ── DetailView ──
function DetailView({c,prev,onBack,onEdit,onConfirm,onReturn,onDelete,onClone,pubFields,onPubApprove}){
  const ch=(f)=>prev&&prev[f]!==undefined&&c[f]!==""&&String(c[f])!==String(prev[f]);
  const Row=({label,field})=>{const changed=ch(field);return <><div className="dt">{label}</div><div className={"dd"+(changed?" chg":"")}>{c[field]||<span style={{color:"#d1d5db"}}>—</span>}{changed&&<span style={{fontSize:9,color:"#ca8a04",marginLeft:5}}>← {prev[field]||"없음"}</span>}</div></>;};
  const fails=SUP_FIELDS.filter(f=>isFail(c[f.key]));
  return <div className="card">
    <div className="chd">
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <button className="btn bs bg" onClick={onBack}>← 목록</button><span className="ctt">{c.taskName}</span>
        <span className="badge" style={{background:ST_COL[c.status]+"15",color:ST_COL[c.status]}}>{STATUSES[c.status]}</span>
        {c.pubStatus!=="NONE"&&<span className="badge" style={{background:PUB_COL[c.pubStatus]+"15",color:PUB_COL[c.pubStatus]}}>{PUB_ST[c.pubStatus]}</span>}
      </div>
      <div style={{display:"flex",gap:5}}>
        {c.status==="SUBMITTED"&&<><button className="btn bs bk" onClick={()=>onConfirm(c)}>✓ 확정</button><button className="btn bs br" onClick={()=>onReturn(c)}>↩ 보완요청</button></>}
        {(c.status==="DRAFT"||c.status==="RETURNED")&&<><button className="btn bs bo" onClick={()=>onEdit(c)}>수정</button><button className="btn bs bg" onClick={()=>onDelete(c)}>삭제</button></>}
        {c.status==="CONFIRMED"&&c.pubStatus==="NONE"&&<button className="btn bs bv" onClick={()=>onPubApprove(c)}>🌐 공개승인</button>}
        <button className="btn bs bg" onClick={()=>onClone(c)}>복제</button>
      </div>
    </div>
    {c.returnComment&&<div className="al aw">⚠ 보완요청: {c.returnComment}</div>}
    {fails.length>0&&<div className="al aw">⚠ 미이행 {fails.length}건: {fails.map(f=>f.label).join(", ")}</div>}
    <div className="sec">위탁기관</div><div className="dg"><Row label="(1) 부처" field="ministry"/><Row label="(2) 담당부서" field="department"/><Row label="(3) 담당자" field="officer"/><Row label="(4) 연락처" field="phone"/></div>
    <div className="sec">위탁사무</div><div className="dg"><Row label="(5) 사무명" field="taskName"/><Row label="(6) 사무근거" field="taskBasis"/><Row label="(7) 사무유형" field="taskType"/><Row label="(8) 위탁근거" field="delegBasis"/><Row label="(9) 위탁형식" field="delegType"/><Row label="(10) 최초시기" field="firstDate"/></div>
    <div className="sec">수탁기관</div><div className="dg"><Row label="(11) 수탁기관" field="contractor"/><Row label="(12) 유형" field="contractorType"/><Row label="(13) 수탁시기" field="contractDate"/><Row label="" field=""/></div>
    <div className="sec">위탁비용</div><div className="dg"><Row label="(14) 부담주체" field="costBearer"/><Row label="(15) 예산비목" field="budgetItem"/><Row label="(16) 비용규모" field="costAmount"/><Row label="" field=""/></div>
    <div className="sec">재위탁</div><div className="dg"><Row label="(17) 재위탁" field="isRedeleg"/><Row label="(18) 근거" field="redelegBasis"/><Row label="(19) 기관" field="redelegOrg"/><Row label="(20) 유형" field="redelegOrgType"/></div>
    <div className="sec">관리·감독</div><div className="dg"><Row label="(22) 계약체결" field="hasContract"/><Row label="(23) 결과공개" field="contractDisclosed"/><Row label="(24) 지침" field="hasGuideline"/><Row label="(25) 편람" field="manualApproved"/><Row label="(26) 감사" field="auditStatus"/><Row label="(27) 감사내용" field="auditDetail"/><Row label="(28) 위원회" field="hasCommittee"/><Row label="(29) 조치계획" field="actionPlan"/></div>
  </div>;
}

// ── BoardView ──
function BoardView({year,cases,allCases,fMin,setFMin,fSt,setFSt,fQ,setFQ,onDetail,onNew,onEdit,onClone,onBulk,onCarry,onOpenDashboard,onOpenPublish}){
  const st={total:allCases.length,draft:allCases.filter(c=>c.status==="DRAFT").length,submitted:allCases.filter(c=>c.status==="SUBMITTED").length,returned:allCases.filter(c=>c.status==="RETURNED").length,confirmed:allCases.filter(c=>c.status==="CONFIRMED").length};
  const ministries=[...new Set(allCases.map(c=>c.ministry))].sort();
  return <>
    <section className="workspace-hero">
      <div className="workspace-hero-copy">
        <div className="hero-eyebrow">GONPUNCLAW · WORKSPACE</div>
        <h2>민간위탁 실태점검과 공개관리를 한 화면에서 다루는 운영형 워크스페이스</h2>
        <p>실태점검, 보완요청, 연도 이월, 공개승인까지 한 흐름으로 정리한 데모입니다. 첫 화면은 설명보다 바로 운영에 들어갈 수 있도록 조용한 제품 UI로 정리했습니다.</p>
        <div className="hero-tags">
          <span className="hero-tag">실태점검 {year}</span>
          <span className="hero-tag">부처 {ministries.length}개</span>
          <span className="hero-tag">공개관리 연계</span>
          <span className="hero-tag">민간위탁 운영 데모</span>
        </div>
      </div>
      <div className="workspace-hero-side">
        <div className="hero-side-label">Current snapshot</div>
        <div className="hero-side-grid">
          <div><span>확정</span><strong>{st.confirmed}</strong></div>
          <div><span>보완요청</span><strong>{st.returned}</strong></div>
          <div><span>작성중</span><strong>{st.draft}</strong></div>
          <div><span>전체</span><strong>{st.total}</strong></div>
        </div>
        <div className="hero-actions">
          <button className="btn bp" onClick={onNew}>＋ 신규 등록</button>
          <button className="btn bo" onClick={onOpenPublish}>🌐 공개 관리</button>
          <button className="btn bg" onClick={onOpenDashboard}>📊 대시보드</button>
        </div>
      </div>
    </section>

    <div className="sg summary-strip">{[{l:"전체",v:st.total,c:"#111827",bg:"#f3f4f6"},{l:"작성중",v:st.draft,c:"#6b7280",bg:"#f9fafb"},{l:"제출완료",v:st.submitted,c:"#2563eb",bg:"#eff6ff"},{l:"보완요청",v:st.returned,c:"#dc2626",bg:"#fef2f2"},{l:"확정",v:st.confirmed,c:"#059669",bg:"#ecfdf5"}].map(s=><div key={s.l} className="sc" style={{background:s.bg,borderColor:s.c+"18"}}><div className="sl" style={{color:s.c}}>{s.l}</div><div className="sv" style={{color:s.c}}>{s.v}</div></div>)}</div>

    <div className="card workspace-table-card"><div className="chd"><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span className="ctt">위탁사무 목록</span><span className="card-meta">{cases.length}건 · 현재 연도 운영 목록</span></div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}><button className="btn bg bs" onClick={onCarry}>📥 이월</button><button className="btn bo bs" onClick={onBulk}>📤 일괄제출</button></div></div>
    <div className="flt filter-strip" style={{marginBottom:12}}><select value={fMin} onChange={e=>setFMin(e.target.value)}><option value="">전체 부처</option>{ministries.map(m=><option key={m}>{m}</option>)}</select><select value={fSt} onChange={e=>setFSt(e.target.value)}><option value="">전체 상태</option>{Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input placeholder="부처·사무명·수탁기관 검색" value={fQ} onChange={e=>setFQ(e.target.value)} style={{width:220}}/></div>
    <div className="tbl-w"><table><thead><tr><th>#</th><th>부처</th><th>위탁사무명</th><th>수탁기관</th><th style={{textAlign:"right"}}>비용</th><th>미이행</th><th>상태</th><th>공개</th><th>관리</th></tr></thead><tbody>
      {!cases.length&&<tr><td colSpan={9} style={{textAlign:"center",padding:36,color:"#64748b"}}>조건에 맞는 데이터가 없습니다</td></tr>}
      {cases.map((c,i)=>{const fl=SUP_FIELDS.filter(f=>isFail(c[f.key])).length;return <tr key={c.id}><td style={{color:"#9ca3af"}}>{i+1}</td><td>{c.ministry}</td><td><span className="lnk" onClick={()=>onDetail(c)}>{c.taskName}</span></td><td style={{maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.contractor}</td><td style={{textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{c.costAmount?Number(c.costAmount).toLocaleString():"-"}</td><td>{fl>0?<span className="badge" style={{background:"#fef2f2",color:"#dc2626"}}>{fl}</span>:<span style={{color:"#d1d5db"}}>—</span>}</td><td><span className="badge" style={{background:ST_COL[c.status]+"15",color:ST_COL[c.status]}}>{STATUSES[c.status]}</span></td><td>{c.pubStatus!=="NONE"?<span className="badge" style={{background:PUB_COL[c.pubStatus]+"15",color:PUB_COL[c.pubStatus]}}>{PUB_ST[c.pubStatus]}</span>:<span style={{color:"#d1d5db"}}>—</span>}</td><td><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{(c.status==="DRAFT"||c.status==="RETURNED")&&<button className="btn bs bo" onClick={()=>onEdit(c)}>수정</button>}<button className="btn bs bg" onClick={()=>onClone(c)}>복제</button></div></td></tr>;})}
    </tbody></table></div></div>
  </>;
}

// ── PublishView (공개 관리) ──
function getEff(pubFields, overrides, field) {
  if (overrides && overrides[field] !== undefined) return overrides[field];
  return !!pubFields[field];
}
function hasOverrides(overrides) {
  return overrides && Object.keys(overrides).length > 0;
}

function PreviewPanel({c, pubFields, onClose}) {
  const ov = c.pubOverrides || {};
  const ovCount = Object.keys(ov).length;
  const PRow = ({label, field}) => {
    const eff = getEff(pubFields, ov, field);
    const isOv = ov[field] !== undefined;
    return <><div className="dt">{label} {!eff && <span style={{fontSize:9,color:"#dc2626"}}>🔒</span>}{isOv && <span style={{fontSize:9,color:"#d97706"}}> ★</span>}</div><div className="dd">{eff ? (c[field] || <span style={{color:"#d1d5db"}}>—</span>) : <span className="mask">비공개</span>}</div></>;
  };
  return <div className="card" style={{border:"2px solid #c084fc"}}>
    <div className="chd"><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>👁</span><span className="ctt">공개 미리보기 — {c.taskName}</span></div><button className="btn bs bg" onClick={onClose}>닫기 ×</button></div>
    <div className="al ap">🔒 비공개 마스킹 적용. {ovCount > 0 && <span>★ 표시 = 이 건에만 적용된 예외 설정 {ovCount}건</span>}</div>
    <div className="pub-preview">
      <div className="sec">위탁기관</div><div className="dg"><PRow label="부처" field="ministry"/><PRow label="담당부서" field="department"/><PRow label="담당자" field="officer"/><PRow label="연락처" field="phone"/></div>
      <div className="sec">위탁사무</div><div className="dg"><PRow label="사무명" field="taskName"/><PRow label="사무근거" field="taskBasis"/><PRow label="사무유형" field="taskType"/><PRow label="위탁근거" field="delegBasis"/><PRow label="위탁형식" field="delegType"/><PRow label="최초시기" field="firstDate"/></div>
      <div className="sec">수탁기관</div><div className="dg"><PRow label="수탁기관" field="contractor"/><PRow label="유형" field="contractorType"/><PRow label="수탁시기" field="contractDate"/><PRow label="" field=""/></div>
      <div className="sec">위탁비용</div><div className="dg"><PRow label="부담주체" field="costBearer"/><PRow label="예산비목" field="budgetItem"/><PRow label="비용규모" field="costAmount"/><PRow label="" field=""/></div>
      <div className="sec">관리·감독</div><div className="dg"><PRow label="계약체결" field="hasContract"/><PRow label="결과공개" field="contractDisclosed"/><PRow label="지침" field="hasGuideline"/><PRow label="편람" field="manualApproved"/><PRow label="감사실시" field="auditStatus"/><PRow label="감사내용" field="auditDetail"/><PRow label="위원회" field="hasCommittee"/><PRow label="조치계획" field="actionPlan"/></div>
    </div>
  </div>;
}

function OverridePanel({c, pubFields, onSetOverride, onClose}) {
  const ov = c.pubOverrides || {};
  const groups = {};
  ALL_FIELDS.forEach(f => { if (!groups[f.group]) groups[f.group] = []; groups[f.group].push(f); });
  return <div className="card" style={{border:"2px solid #d97706"}}>
    <div className="chd">
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:16}}>⚙️</span>
        <span className="ctt">건별 예외 설정 — {c.taskName}</span>
      </div>
      <div style={{display:"flex",gap:5}}>
        <button className="btn bs bg" onClick={() => onSetOverride(c.id, {})} title="모든 예외를 제거하고 글로벌 정책으로 복원">예외 초기화</button>
        <button className="btn bs bg" onClick={onClose}>닫기 ×</button>
      </div>
    </div>
    <div className="al" style={{background:"#fffbeb",border:"1px solid #fde68a",color:"#92400e"}}>
      ★ 글로벌 정책과 다르게 설정된 항목만 예외로 적용됩니다. 토글이 <strong>글로벌 정책과 동일</strong>하면 예외에서 자동 제거됩니다.
    </div>
    {Object.entries(groups).map(([gn, fields]) => (
      <div key={gn} style={{marginBottom:10}}>
        <div style={{fontSize:10,fontWeight:700,color:"#0f2240",marginBottom:3,paddingBottom:2,borderBottom:"1px solid #f0f2f5"}}>{gn}</div>
        {fields.map(f => {
          const globalVal = !!pubFields[f.key];
          const effVal = getEff(pubFields, ov, f.key);
          const isOverridden = ov[f.key] !== undefined;
          return <div key={f.key} className="toggle" onClick={() => {
            const newVal = !effVal;
            if (newVal === globalVal) {
              const next = {...ov};
              delete next[f.key];
              onSetOverride(c.id, next);
            } else {
              onSetOverride(c.id, {...ov, [f.key]: newVal});
            }
          }}>
            <div className={"toggle-sw " + (effVal ? "on" : "off")} />
            <span style={{flex:1,fontSize:12}}>{f.label}</span>
            {isOverridden && <span className="badge" style={{background:"#fef3c7",color:"#d97706",fontSize:9}}>★ 예외</span>}
            {!isOverridden && <span style={{fontSize:9,color:"#9ca3af"}}>글로벌</span>}
            {f.warn && <span style={{fontSize:9,color:"#dc2626",fontWeight:600}}>⚠ {f.warn}</span>}
          </div>;
        })}
      </div>
    ))}
  </div>;
}

function PublishView({cases,pubFields,setPubFields,onPubApprove,onPubRevoke,onExport,onSetOverride,show}){
  const [preview,setPreview]=useState(null);
  const [overrideId,setOverrideId]=useState(null);
  const confirmed=cases.filter(c=>c.status==="CONFIRMED");
  const previewCase=preview?confirmed.find(x=>x.id===preview):null;
  const overrideCase=overrideId?confirmed.find(x=>x.id===overrideId):null;
  const approved=confirmed.filter(c=>c.pubStatus==="APPROVED"||c.pubStatus==="EXPORTED");
  const overriddenCount=confirmed.filter(c=>hasOverrides(c.pubOverrides)).length;
  const groups=useMemo(()=>{const g={};ALL_FIELDS.forEach(f=>{if(!g[f.group])g[f.group]=[];g[f.group].push(f);});return g;},[]);
  const pubCount=ALL_FIELDS.filter(f=>pubFields[f.key]).length;
  const privCount=ALL_FIELDS.length-pubCount;

  return <>
    <div className="sg" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
      <div className="sc" style={{background:"#eff6ff",borderColor:"#93c5fd"}}><div className="sl" style={{color:"#2563eb"}}>확정 건수</div><div className="sv" style={{color:"#2563eb"}}>{confirmed.length}</div></div>
      <div className="sc" style={{background:"#f3e8ff",borderColor:"#c084fc"}}><div className="sl" style={{color:"#7c3aed"}}>공개승인</div><div className="sv" style={{color:"#7c3aed"}}>{approved.length}</div></div>
      <div className="sc" style={{background:"#ecfdf5",borderColor:"#6ee7b7"}}><div className="sl" style={{color:"#059669"}}>공개 필드</div><div className="sv" style={{color:"#059669"}}>{pubCount}개</div></div>
      <div className="sc" style={{background:"#fef2f2",borderColor:"#fca5a5"}}><div className="sl" style={{color:"#dc2626"}}>비공개 필드</div><div className="sv" style={{color:"#dc2626"}}>{privCount}개</div></div>
      <div className="sc" style={{background:"#fffbeb",borderColor:"#fde68a"}}><div className="sl" style={{color:"#d97706"}}>예외 설정 건</div><div className="sv" style={{color:"#d97706"}}>{overriddenCount}</div></div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:14}}>
      {/* 필드 공개 범위 설정 */}
      <div className="card">
        <div className="ctt" style={{marginBottom:12}}>🔧 필드 공개 범위 설정</div>
        <div className="al ai">전체 기본 설정입니다. 인터넷망에 전송될 필드를 선택하세요.</div>
        {Object.entries(groups).map(([gn,fields])=>(
          <div key={gn} style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#0f2240",marginBottom:4,paddingBottom:3,borderBottom:"1px solid #f0f2f5"}}>{gn}</div>
            {fields.map(f=>(
              <div key={f.key} className="toggle" onClick={()=>setPubFields(p=>({...p,[f.key]:!p[f.key]}))}>
                <div className={"toggle-sw "+(pubFields[f.key]?"on":"off")}/>
                <span style={{flex:1}}>{f.label}</span>
                {f.warn&&<span style={{fontSize:9,color:"#dc2626",fontWeight:600}}>⚠ {f.warn}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 공개 승인 관리 + 미리보기 */}
      <div>
        <div className="card">
          <div className="chd">
            <div className="ctt">📋 공개 승인 관리</div>
            <div style={{display:"flex",gap:5}}>
              <button className="btn bs bv" onClick={()=>{const t=confirmed.filter(c=>c.pubStatus==="NONE");if(!t.length){show("⚠ 승인 대상 없음");return;}t.forEach(c=>onPubApprove(c));show("✓ "+t.length+"건 일괄 공개승인");}}>🌐 미승인 일괄승인</button>
              <button className="btn bs bk" onClick={onExport}>📥 공개용 내보내기</button>
            </div>
          </div>
          {!confirmed.length&&<div style={{textAlign:"center",padding:20,color:"#636d82"}}>확정된 건이 없습니다</div>}
          {confirmed.length>0&&<table><thead><tr><th>#</th><th>부처</th><th>위탁사무명</th><th>수탁기관</th><th>예외</th><th>공개상태</th><th>관리</th></tr></thead><tbody>
            {confirmed.map((c,i)=>{
              const ovCnt=c.pubOverrides?Object.keys(c.pubOverrides).length:0;
              return <tr key={c.id}><td style={{color:"#9ca3af"}}>{i+1}</td><td style={{fontSize:11}}>{c.ministry}</td><td style={{fontSize:12,fontWeight:500}}>{c.taskName}</td><td style={{fontSize:11}}>{c.contractor}</td><td>{ovCnt>0?<span className="badge" style={{background:"#fef3c7",color:"#d97706"}}>★ {ovCnt}</span>:<span style={{color:"#d1d5db",fontSize:10}}>—</span>}</td><td><span className="badge" style={{background:PUB_COL[c.pubStatus]+"15",color:PUB_COL[c.pubStatus]}}>{PUB_ST[c.pubStatus]}</span></td><td><div style={{display:"flex",gap:3}}>
              {c.pubStatus==="NONE"&&<button className="btn bs bv" onClick={()=>{onPubApprove(c);show("✓ 공개승인")}}>승인</button>}
              {c.pubStatus!=="NONE"&&<button className="btn bs bg" onClick={()=>{onPubRevoke(c);show("✓ 승인취소")}}>취소</button>}
              <button className="btn bs" style={{background:"#fffbeb",color:"#d97706",border:"1px solid #fde68a"}} onClick={()=>setOverrideId(overrideId===c.id?null:c.id)}>예외설정</button>
              <button className="btn bs bo" onClick={()=>{setPreview(preview===c.id?null:c.id);setOverrideId(null);}}>미리보기</button>
            </div></td></tr>;})}
          </tbody></table>}
        </div>

        {overrideCase && <OverridePanel c={overrideCase} pubFields={pubFields} onSetOverride={onSetOverride} onClose={()=>setOverrideId(null)} />}
        {previewCase && <PreviewPanel c={previewCase} pubFields={pubFields} onClose={()=>setPreview(null)} />}
      </div>
    </div>
  </>;
}

// ── Dashboard ──
function DashboardView({cases}){
  const byMin=useMemo(()=>{const m={};cases.forEach(c=>{if(!m[c.ministry])m[c.ministry]={ministry:c.ministry,total:0,fails:0,d:{}};m[c.ministry].total++;SUP_FIELDS.forEach(f=>{if(isFail(c[f.key])){m[c.ministry].fails++;if(!m[c.ministry].d[f.label])m[c.ministry].d[f.label]=0;m[c.ministry].d[f.label]++;}});});return Object.values(m).sort((a,b)=>b.fails-a.fails);},[cases]);
  const tf=byMin.reduce((s,m)=>s+m.fails,0);const ti=cases.length*SUP_FIELDS.length;const cr=ti?Math.round(((ti-tf)/ti)*100):0;
  const sd=[{name:"작성중",value:cases.filter(c=>c.status==="DRAFT").length,color:"#6b7280"},{name:"제출완료",value:cases.filter(c=>c.status==="SUBMITTED").length,color:"#2563eb"},{name:"보완요청",value:cases.filter(c=>c.status==="RETURNED").length,color:"#dc2626"},{name:"확정",value:cases.filter(c=>c.status==="CONFIRMED").length,color:"#059669"}].filter(d=>d.value>0);
  return <>
    <div className="sg" style={{gridTemplateColumns:"repeat(4,1fr)"}}><div className="sc" style={{background:"#eff6ff",borderColor:"#93c5fd"}}><div className="sl" style={{color:"#2563eb"}}>위탁사무</div><div className="sv" style={{color:"#2563eb"}}>{cases.length}건</div></div><div className="sc" style={{background:cr>=80?"#ecfdf5":"#fef2f2",borderColor:cr>=80?"#6ee7b7":"#fca5a5"}}><div className="sl" style={{color:cr>=80?"#059669":"#dc2626"}}>이행률</div><div className="sv" style={{color:cr>=80?"#059669":"#dc2626"}}>{cr}%</div></div><div className="sc" style={{background:"#fef2f2",borderColor:"#fca5a5"}}><div className="sl" style={{color:"#dc2626"}}>미이행</div><div className="sv" style={{color:"#dc2626"}}>{tf}건</div></div><div className="sc" style={{background:"#f5f3ff",borderColor:"#c4b5fd"}}><div className="sl" style={{color:"#7c3aed"}}>부처</div><div className="sv" style={{color:"#7c3aed"}}>{byMin.length}개</div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div className="card"><div className="ctt" style={{marginBottom:12}}>부처별 미이행</div><ResponsiveContainer width="100%" height={200}><BarChart data={byMin} layout="vertical" margin={{left:8,right:16}}><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="ministry" width={100} tick={{fontSize:10}}/><Tooltip contentStyle={{fontSize:11}}/><Bar dataKey="fails" fill="#ef4444" radius={[0,3,3,0]} name="미이행"/></BarChart></ResponsiveContainer></div>
      <div className="card"><div className="ctt" style={{marginBottom:12}}>제출 현황</div><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={sd} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name,value})=>name+" "+value} style={{fontSize:10}}>{sd.map((d,i)=><Cell key={i} fill={d.color}/>)}</Pie><Legend iconSize={8} wrapperStyle={{fontSize:10}}/><Tooltip contentStyle={{fontSize:11}}/></PieChart></ResponsiveContainer></div>
    </div>
    {byMin.filter(m=>m.fails>0).length>0&&<div className="card"><div className="ctt" style={{marginBottom:10}}>미이행 상세</div><table><thead><tr><th>부처</th><th>전체</th><th>미이행</th>{SUP_FIELDS.map(f=><th key={f.key} style={{fontSize:9,padding:"5px 6px"}}>{f.label.replace(/\(\d+\)\s*/,"")}</th>)}<th>율</th></tr></thead><tbody>{byMin.filter(m=>m.fails>0).map(m=><tr key={m.ministry}><td style={{fontWeight:600}}>{m.ministry}</td><td>{m.total}</td><td style={{color:"#dc2626",fontWeight:600}}>{m.fails}</td>{SUP_FIELDS.map(f=><td key={f.key} style={{textAlign:"center",color:m.d[f.label]?"#dc2626":"#d1d5db"}}>{m.d[f.label]||"—"}</td>)}<td><span className="badge" style={{background:"#fef2f2",color:"#dc2626"}}>{Math.round(m.fails/(m.total*6)*100)}%</span></td></tr>)}</tbody></table></div>}
  </>;
}

// ── StatsView ──
function StatsView({cases}){
  const cm=useMemo(()=>{const m={};cases.forEach(c=>{if(!m[c.ministry])m[c.ministry]=0;m[c.ministry]+=Number(c.costAmount)||0;});return Object.entries(m).map(([k,v])=>({name:k,value:v})).sort((a,b)=>b.value-a.value);},[cases]);
  const bt=useMemo(()=>{const m={};cases.forEach(c=>{if(c.taskType){if(!m[c.taskType])m[c.taskType]=0;m[c.taskType]++;}});return Object.entries(m).map(([k,v])=>({name:k,value:v})).sort((a,b)=>b.value-a.value);},[cases]);
  const bo=useMemo(()=>{const m={};cases.forEach(c=>{if(c.contractorType){if(!m[c.contractorType])m[c.contractorType]=0;m[c.contractorType]++;}});return Object.entries(m).map(([k,v])=>({name:k,value:v})).sort((a,b)=>b.value-a.value);},[cases]);
  const tc=cm.reduce((s,d)=>s+d.value,0);
  return <>
    <div className="sg" style={{gridTemplateColumns:"repeat(3,1fr)"}}><div className="sc" style={{background:"#eff6ff",borderColor:"#93c5fd"}}><div className="sl" style={{color:"#2563eb"}}>위탁사무</div><div className="sv" style={{color:"#2563eb"}}>{cases.length}건</div></div><div className="sc" style={{background:"#fefce8",borderColor:"#fde68a"}}><div className="sl" style={{color:"#a16207"}}>총 비용</div><div className="sv" style={{color:"#a16207"}}>{(tc/1000).toFixed(1)}십억</div></div><div className="sc" style={{background:"#f5f3ff",borderColor:"#c4b5fd"}}><div className="sl" style={{color:"#7c3aed"}}>건당 평균</div><div className="sv" style={{color:"#7c3aed"}}>{cases.length?Math.round(tc/cases.length).toLocaleString():0}백만</div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div className="card"><div className="ctt" style={{marginBottom:12}}>부처별 비용</div><ResponsiveContainer width="100%" height={200}><BarChart data={cm} layout="vertical" margin={{left:8,right:16}}><XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>v>=1000?(v/1000).toFixed(0)+"십억":v.toLocaleString()}/><YAxis type="category" dataKey="name" width={100} tick={{fontSize:10}}/><Tooltip contentStyle={{fontSize:11}} formatter={v=>[v.toLocaleString()+"백만원"]}/><Bar dataKey="value" fill="#2563eb" radius={[0,3,3,0]}/></BarChart></ResponsiveContainer></div>
      <div className="card"><div className="ctt" style={{marginBottom:12}}>사무유형</div><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={bt} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name,value})=>name+"("+value+")"} style={{fontSize:9}}>{bt.map((_,i)=><Cell key={i} fill={PIE_C[i%PIE_C.length]}/>)}</Pie><Tooltip contentStyle={{fontSize:11}}/></PieChart></ResponsiveContainer></div>
      <div className="card"><div className="ctt" style={{marginBottom:12}}>수탁기관 유형</div><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={bo} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name,value})=>name+"("+value+")"} style={{fontSize:9}}>{bo.map((_,i)=><Cell key={i} fill={PIE_C[(i+3)%PIE_C.length]}/>)}</Pie><Tooltip contentStyle={{fontSize:11}}/></PieChart></ResponsiveContainer></div>
    </div>
  </>;
}

// ── App ──
export default function App(){
  const[year,setYear]=useState(2024);
  const[allData,setAllData]=useState({2024:mkSample(2024),2025:mkSample(2025)});
  const[tab,setTab]=useState("board");const[view,setView]=useState("list");
  const[sel,setSel]=useState(null);const[editing,setEditing]=useState(null);
  const[toast,setToast]=useState(null);
  const[fMin,setFMin]=useState("");const[fSt,setFSt]=useState("");const[fQ,setFQ]=useState("");
  const[pubFields,setPubFields]=useState(defaultPubFields());

  const cases=allData[year]||[];const prevCases=allData[year-1]||[];
  const setCases=(fn)=>setAllData(d=>({...d,[year]:typeof fn==="function"?fn(d[year]||[]):fn}));
  const show=(m)=>{setToast(m);setTimeout(()=>setToast(null),2500);};
  const filtered=cases.filter(c=>{if(fMin&&c.ministry!==fMin)return false;if(fSt&&c.status!==fSt)return false;if(fQ&&!c.taskName.includes(fQ)&&!c.contractor.includes(fQ)&&!c.ministry.includes(fQ))return false;return true;});
  const getPrev=(c)=>prevCases.find(p=>p.taskName===c.taskName&&p.ministry===c.ministry);
  const resetView=()=>{setView("list");setSel(null);setEditing(null);};
  const doCarryover=()=>{const src=allData[year-1];if(!src||!src.length){show("⚠ 전년도 없음");return;}if(cases.length>0&&!confirm("추가 이월?"))return;const ex=new Set(cases.map(c=>c.ministry+c.taskName));const cr=src.filter(s=>!ex.has(s.ministry+s.taskName)).map(s=>{const n={...s,id:year+"-c-"+Math.random().toString(36).slice(2,8),year,status:"DRAFT",pubStatus:"NONE",pubOverrides:{},updatedAt:new Date().toISOString().slice(0,10),files:[],returnComment:""};RESET_KEYS.forEach(k=>{n[k]="";});return n;});setCases(p=>[...p,...cr]);show("✓ "+cr.length+"건 이월");};
  const saveCase=(c,sub)=>{const u={...c,updatedAt:new Date().toISOString().slice(0,10)};if(sub)u.status="SUBMITTED";else if(c.status==="RETURNED")u.status="DRAFT";const ex=cases.find(x=>x.id===c.id);if(ex)setCases(p=>p.map(x=>x.id===c.id?u:x));else setCases(p=>[...p,u]);show(sub?"✓ 제출":"✓ 임시저장");setView("list");setEditing(null);};
  const cloneCase=(c)=>{setEditing({...c,id:Date.now().toString(),taskName:"",taskBasis:"",taskType:"",delegBasis:"",delegType:"",firstDate:"",contractor:"",contractorType:"",contractDate:"",costAmount:"",auditDetail:"",actionPlan:"",remarks:"",status:"DRAFT",pubStatus:"NONE",pubOverrides:{},updatedAt:new Date().toISOString().slice(0,10),files:[],returnComment:""});setView("form");};
  const confirmCase=(c)=>{setCases(p=>p.map(x=>x.id===c.id?{...x,status:"CONFIRMED",updatedAt:new Date().toISOString().slice(0,10)}:x));show("✓ 확정");setView("list");};
  const returnCase=(c)=>{const cm=prompt("보완요청 사유:");if(!cm)return;setCases(p=>p.map(x=>x.id===c.id?{...x,status:"RETURNED",returnComment:cm,updatedAt:new Date().toISOString().slice(0,10)}:x));show("✓ 보완요청");setView("list");};
  const deleteCase=(c)=>{if(!confirm("삭제?"))return;setCases(p=>p.filter(x=>x.id!==c.id));show("✓ 삭제");setView("list");};
  const bulkSubmit=()=>{const d=filtered.filter(c=>c.status==="DRAFT"||c.status==="RETURNED");if(!d.length){show("⚠ 대상 없음");return;}if(!confirm(d.length+"건 일괄제출?"))return;setCases(p=>p.map(c=>d.find(x=>x.id===c.id)?{...c,status:"SUBMITTED",updatedAt:new Date().toISOString().slice(0,10)}:c));show("✓ "+d.length+"건 제출");};
  const pubApprove=(c)=>setCases(p=>p.map(x=>x.id===c.id?{...x,pubStatus:"APPROVED"}:x));
  const pubRevoke=(c)=>setCases(p=>p.map(x=>x.id===c.id?{...x,pubStatus:"NONE"}:x));
  const pubSetOverride=(caseId,overrides)=>setCases(p=>p.map(x=>x.id===caseId?{...x,pubOverrides:overrides}:x));
  const pubExport=()=>{
    const approved=cases.filter(c=>c.pubStatus==="APPROVED"||c.pubStatus==="EXPORTED");
    if(!approved.length){show("⚠ 공개승인 건 없음");return;}
    const exportData=approved.map(c=>{
      const ov=c.pubOverrides||{};
      const row={};
      ALL_FIELDS.forEach(f=>{
        const eff=getEff(pubFields,ov,f.key);
        if(eff) row[f.key]=c[f.key]||"";
      });
      return row;
    });
    const json=JSON.stringify(exportData,null,2);
    const blob=new Blob([json],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="민간위탁_공개데이터_"+year+".json";a.click();URL.revokeObjectURL(url);
    setCases(p=>p.map(c=>c.pubStatus==="APPROVED"?{...c,pubStatus:"EXPORTED"}:c));
    show("✓ "+approved.length+"건 JSON 내보내기 완료 (망연계 전송 대상)");
  };

  let content=null;
  if(tab==="board"&&view==="list")content=<BoardView year={year} cases={filtered} allCases={cases} fMin={fMin} setFMin={setFMin} fSt={fSt} setFSt={setFSt} fQ={fQ} setFQ={setFQ} onDetail={c=>{setSel(c);setView("detail");}} onNew={()=>{setEditing(emptyCase(year));setView("form");}} onEdit={c=>{setEditing({...c});setView("form");}} onClone={cloneCase} onBulk={bulkSubmit} onCarry={doCarryover} onOpenDashboard={()=>{setTab("dashboard");resetView();}} onOpenPublish={()=>{setTab("publish");resetView();}}/>;
  else if(tab==="board"&&view==="detail"&&sel)content=<DetailView c={sel} prev={getPrev(sel)} onBack={()=>setView("list")} onEdit={c=>{setEditing({...c});setView("form");}} onConfirm={confirmCase} onReturn={returnCase} onDelete={deleteCase} onClone={cloneCase} pubFields={pubFields} onPubApprove={c=>{pubApprove(c);show("✓ 공개승인")}}/>;
  else if(tab==="board"&&view==="form"&&editing)content=<FormView c={editing} prev={getPrev(editing)} onSave={saveCase} onBack={()=>{setView("list");setEditing(null);}} year={year}/>;
  else if(tab==="dashboard")content=<DashboardView cases={cases}/>;
  else if(tab==="stats")content=<StatsView cases={cases}/>;
  else if(tab==="publish")content=<PublishView cases={cases} pubFields={pubFields} setPubFields={setPubFields} onPubApprove={pubApprove} onPubRevoke={pubRevoke} onExport={pubExport} onSetOverride={pubSetOverride} show={show}/>;

  return <div className="app"><style>{css}</style>
    <header className="hdr"><div className="hdr-l"><div className="logo">위</div><div className="brand-block"><div className="brand-kicker">GONPUNCLAW · INSPECTOR</div><h1>국가사무 민간위탁 실태점검 시스템</h1></div></div><div className="hdr-r"><div className="yr-sel">📅 <select value={year} onChange={e=>{setYear(+e.target.value);resetView();}}><option value={2024}>2024년</option><option value={2025}>2025년</option></select></div><div className="user-chip">👤 서호성 사무관</div></div></header>
    <nav className="nav">{[["board","목록"],["dashboard","대시보드"],["stats","통계"],["publish","공개 관리"]].map(([k,l])=><div key={k} className={"ni"+(tab===k?" on":"")} onClick={()=>{setTab(k);resetView();}}>{l}</div>)}</nav>
    <div className="ct">{content}</div>
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}
