var Le=(e,t,n)=>new Promise((i,a)=>{var o=h=>{try{c(n.next(h))}catch(_){a(_)}},s=h=>{try{c(n.throw(h))}catch(_){a(_)}},c=h=>h.done?i(h.value):Promise.resolve(h.value).then(o,s);c((n=n.apply(e,t)).next())});import{_ as Ke}from"./TheIcon-4d30aea2.js";import{d as j,h as r,c as p,a as x,e as I,u as Ne,du as vt,H as st,b as Y,p as at,aD as gt,dO as Nt,dP as re,dQ as te,dR as le,dS as fe,dT as oe,dU as ke,dV as ve,r as B,dp as _e,dw as xe,i as H,k as bt,n as Ve,K as yt,dW as Ue,dX as Qe,dY as Ye,dZ as Je,da as Ot,c$ as qt,d0 as Ht,f as Oe,d_ as Et,t as pe,aa as jt,aQ as ut,j as wt,d2 as Lt,d5 as Kt,aw as Gt,a7 as Xt,d4 as Zt,A as he,aG as Q,ab as Wt,s as Qt,v as Yt,d$ as Jt,e0 as ei,e1 as ti,e2 as ii,q as ct,z as $e,e3 as dt,bT as Ge,cv as Xe,L as oi,e4 as ni,P as ie,S as Se,$ as b,R as V,U as y,X as Fe,F as ai,T as ri,Z as Te,a0 as li,a4 as si,Q as Ae,ae as Ze,Y as mt,as as ui}from"./index-07a98a1f.js";import{N as O}from"./Input-187c70b5.js";import{b as et,V as ci,d as di,e as mi,N as pi}from"./Popover-b1c14097.js";import{_ as hi,a as Z,N as fi}from"./CommonPage-ba2636bf.js";import{_ as vi}from"./_plugin-vue_export-helper-c27b6911.js";import{a as kt,u as tt}from"./use-locale-33ac5cb9.js";import{A as pt}from"./Add-02a5f8fe.js";import{R as gi}from"./Remove-3ea03862.js";import{A as bi}from"./ArrowDown-91ecd1ee.js";import{N as We}from"./Image-1cc3ee15.js";import"./format-length-c9d165c6.js";import"./AppPage-26fa9560.js";import"./Tooltip-a1fdf8da.js";function _t(e,t,n){t/=100,n/=100;const i=t*Math.min(n,1-n)+n;return[e,i?(2-2*n/i)*100:0,i*100]}function Be(e,t,n){t/=100,n/=100;const i=n-n*t/2,a=Math.min(i,1-i);return[e,a?(n-i)/a*100:0,i*100]}function ae(e,t,n){t/=100,n/=100;let i=(a,o=(a+e/60)%6)=>n-n*t*Math.max(Math.min(o,4-o,1),0);return[i(5)*255,i(3)*255,i(1)*255]}function it(e,t,n){e/=255,t/=255,n/=255;let i=Math.max(e,t,n),a=i-Math.min(e,t,n),o=a&&(i==e?(t-n)/a:i==t?2+(n-e)/a:4+(e-t)/a);return[60*(o<0?o+6:o),i&&a/i*100,i*100]}function ot(e,t,n){e/=255,t/=255,n/=255;let i=Math.max(e,t,n),a=i-Math.min(e,t,n),o=1-Math.abs(i+i-a-1),s=a&&(i==e?(t-n)/a:i==t?2+(n-e)/a:4+(e-t)/a);return[60*(s<0?s+6:s),o?a/o*100:0,(i+i-a)*50]}function nt(e,t,n){t/=100,n/=100;let i=t*Math.min(n,1-n),a=(o,s=(o+e/30)%12)=>n-i*Math.max(Math.min(s-3,9-s,1),-1);return[a(0)*255,a(8)*255,a(4)*255]}const yi=j({name:"ArrowUp",render(){return r("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 20 20"},r("g",{fill:"none"},r("path",{d:"M3.13 9.163a.5.5 0 1 0 .74.674L9.5 3.67V17.5a.5.5 0 0 0 1 0V3.672l5.63 6.165a.5.5 0 0 0 .738-.674l-6.315-6.916a.746.746 0 0 0-.632-.24a.746.746 0 0 0-.476.24L3.131 9.163z",fill:"currentColor"})))}}),wi=p("input-group",`
 display: inline-flex;
 width: 100%;
 flex-wrap: nowrap;
 vertical-align: bottom;
`,[x(">",[p("input",[x("&:not(:last-child)",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `),x("&:not(:first-child)",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 margin-left: -1px!important;
 `)]),p("button",[x("&:not(:last-child)",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `,[I("state-border, border",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `)]),x("&:not(:first-child)",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `,[I("state-border, border",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `)])]),x("*",[x("&:not(:last-child)",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `,[x(">",[p("input",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `),p("base-selection",[p("base-selection-label",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `),p("base-selection-tags",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `),I("box-shadow, border, state-border",`
 border-top-right-radius: 0!important;
 border-bottom-right-radius: 0!important;
 `)])])]),x("&:not(:first-child)",`
 margin-left: -1px!important;
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `,[x(">",[p("input",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `),p("base-selection",[p("base-selection-label",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `),p("base-selection-tags",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `),I("box-shadow, border, state-border",`
 border-top-left-radius: 0!important;
 border-bottom-left-radius: 0!important;
 `)])])])])])]),ki={},_i=j({name:"InputGroup",props:ki,setup(e){const{mergedClsPrefixRef:t}=Ne(e);return vt("-input-group",wi,t),{mergedClsPrefix:t}},render(){const{mergedClsPrefix:e}=this;return r("div",{class:`${e}-input-group`},this.$slots)}}),U="0!important",xt="-1px!important";function be(e){return Y(e+"-type",[x("& +",[p("button",{},[Y(e+"-type",[I("border",{borderLeftWidth:U}),I("state-border",{left:xt})])])])])}function ye(e){return Y(e+"-type",[x("& +",[p("button",[Y(e+"-type",[I("border",{borderTopWidth:U}),I("state-border",{top:xt})])])])])}const xi=p("button-group",`
 flex-wrap: nowrap;
 display: inline-flex;
 position: relative;
`,[st("vertical",{flexDirection:"row"},[st("rtl",[p("button",[x("&:first-child:not(:last-child)",`
 margin-right: ${U};
 border-top-right-radius: ${U};
 border-bottom-right-radius: ${U};
 `),x("&:last-child:not(:first-child)",`
 margin-left: ${U};
 border-top-left-radius: ${U};
 border-bottom-left-radius: ${U};
 `),x("&:not(:first-child):not(:last-child)",`
 margin-left: ${U};
 margin-right: ${U};
 border-radius: ${U};
 `),be("default"),Y("ghost",[be("primary"),be("info"),be("success"),be("warning"),be("error")])])])]),Y("vertical",{flexDirection:"column"},[p("button",[x("&:first-child:not(:last-child)",`
 margin-bottom: ${U};
 margin-left: ${U};
 margin-right: ${U};
 border-bottom-left-radius: ${U};
 border-bottom-right-radius: ${U};
 `),x("&:last-child:not(:first-child)",`
 margin-top: ${U};
 margin-left: ${U};
 margin-right: ${U};
 border-top-left-radius: ${U};
 border-top-right-radius: ${U};
 `),x("&:not(:first-child):not(:last-child)",`
 margin: ${U};
 border-radius: ${U};
 `),ye("default"),Y("ghost",[ye("primary"),ye("info"),ye("success"),ye("warning"),ye("error")])])])]),$i={size:{type:String,default:void 0},vertical:Boolean},Si=j({name:"ButtonGroup",props:$i,setup(e){const{mergedClsPrefixRef:t,mergedRtlRef:n}=Ne(e);return vt("-button-group",xi,t),at(Nt,e),{rtlEnabled:gt("ButtonGroup",n,t),mergedClsPrefix:t}},render(){const{mergedClsPrefix:e}=this;return r("div",{class:[`${e}-button-group`,this.rtlEnabled&&`${e}-button-group--rtl`,this.vertical&&`${e}-button-group--vertical`],role:"group"},this.$slots)}});function Ci(e,t){switch(e[0]){case"hex":return t?"#000000FF":"#000000";case"rgb":return t?"rgba(0, 0, 0, 1)":"rgb(0, 0, 0)";case"hsl":return t?"hsla(0, 0%, 0%, 1)":"hsl(0, 0%, 0%)";case"hsv":return t?"hsva(0, 0%, 0%, 1)":"hsv(0, 0%, 0%)"}return"#000000"}function Re(e){return e===null?null:/^ *#/.test(e)?"hex":e.includes("rgb")?"rgb":e.includes("hsl")?"hsl":e.includes("hsv")?"hsv":null}function Ui(e){return e=Math.round(e),e>=360?359:e<0?0:e}function Ri(e){return e=Math.round(e*100)/100,e>1?1:e<0?0:e}const Vi={rgb:{hex(e){return re(te(e))},hsl(e){const[t,n,i,a]=te(e);return le([...ot(t,n,i),a])},hsv(e){const[t,n,i,a]=te(e);return fe([...it(t,n,i),a])}},hex:{rgb(e){return oe(te(e))},hsl(e){const[t,n,i,a]=te(e);return le([...ot(t,n,i),a])},hsv(e){const[t,n,i,a]=te(e);return fe([...it(t,n,i),a])}},hsl:{hex(e){const[t,n,i,a]=ke(e);return re([...nt(t,n,i),a])},rgb(e){const[t,n,i,a]=ke(e);return oe([...nt(t,n,i),a])},hsv(e){const[t,n,i,a]=ke(e);return fe([..._t(t,n,i),a])}},hsv:{hex(e){const[t,n,i,a]=ve(e);return re([...ae(t,n,i),a])},rgb(e){const[t,n,i,a]=ve(e);return oe([...ae(t,n,i),a])},hsl(e){const[t,n,i,a]=ve(e);return le([...Be(t,n,i),a])}}};function $t(e,t,n){return n=n||Re(e),n?n===t?e:Vi[n][t](e):null}const we="12px",Pi=12,de="6px",Ii=6,Ai="linear-gradient(90deg,red,#ff0 16.66%,#0f0 33.33%,#0ff 50%,#00f 66.66%,#f0f 83.33%,red)",Di=j({name:"HueSlider",props:{clsPrefix:{type:String,required:!0},hue:{type:Number,required:!0},onUpdateHue:{type:Function,required:!0},onComplete:Function},setup(e){const t=B(null);function n(o){t.value&&(_e("mousemove",document,i),_e("mouseup",document,a),i(o))}function i(o){const{value:s}=t;if(!s)return;const{width:c,left:h}=s.getBoundingClientRect(),_=Ui((o.clientX-h-Ii)/(c-Pi)*360);e.onUpdateHue(_)}function a(){var o;xe("mousemove",document,i),xe("mouseup",document,a),(o=e.onComplete)===null||o===void 0||o.call(e)}return{railRef:t,handleMouseDown:n}},render(){const{clsPrefix:e}=this;return r("div",{class:`${e}-color-picker-slider`,style:{height:we,borderRadius:de}},r("div",{ref:"railRef",style:{boxShadow:"inset 0 0 2px 0 rgba(0, 0, 0, .24)",boxSizing:"border-box",backgroundImage:Ai,height:we,borderRadius:de,position:"relative"},onMousedown:this.handleMouseDown},r("div",{style:{position:"absolute",left:de,right:de,top:0,bottom:0}},r("div",{class:`${e}-color-picker-handle`,style:{left:`calc((${this.hue}%) / 359 * 100 - ${de})`,borderRadius:de,width:we,height:we}},r("div",{class:`${e}-color-picker-handle__fill`,style:{backgroundColor:`hsl(${this.hue}, 100%, 50%)`,borderRadius:de,width:we,height:we}})))))}}),Ce="12px",zi=12,me="6px",Mi=j({name:"AlphaSlider",props:{clsPrefix:{type:String,required:!0},rgba:{type:Array,default:null},alpha:{type:Number,default:0},onUpdateAlpha:{type:Function,required:!0},onComplete:Function},setup(e){const t=B(null);function n(o){!t.value||!e.rgba||(_e("mousemove",document,i),_e("mouseup",document,a),i(o))}function i(o){const{value:s}=t;if(!s)return;const{width:c,left:h}=s.getBoundingClientRect(),_=(o.clientX-h)/(c-zi);e.onUpdateAlpha(Ri(_))}function a(){var o;xe("mousemove",document,i),xe("mouseup",document,a),(o=e.onComplete)===null||o===void 0||o.call(e)}return{railRef:t,railBackgroundImage:H(()=>{const{rgba:o}=e;return o?`linear-gradient(to right, rgba(${o[0]}, ${o[1]}, ${o[2]}, 0) 0%, rgba(${o[0]}, ${o[1]}, ${o[2]}, 1) 100%)`:""}),handleMouseDown:n}},render(){const{clsPrefix:e}=this;return r("div",{class:`${e}-color-picker-slider`,ref:"railRef",style:{height:Ce,borderRadius:me},onMousedown:this.handleMouseDown},r("div",{style:{borderRadius:me,position:"absolute",left:0,right:0,top:0,bottom:0,overflow:"hidden"}},r("div",{class:`${e}-color-picker-checkboard`}),r("div",{class:`${e}-color-picker-slider__image`,style:{backgroundImage:this.railBackgroundImage}})),this.rgba&&r("div",{style:{position:"absolute",left:me,right:me,top:0,bottom:0}},r("div",{class:`${e}-color-picker-handle`,style:{left:`calc(${this.alpha*100}% - ${me})`,borderRadius:me,width:Ce,height:Ce}},r("div",{class:`${e}-color-picker-handle__fill`,style:{backgroundColor:oe(this.rgba),borderRadius:me,width:Ce,height:Ce}}))))}}),De="12px",ze="6px",Bi=j({name:"Pallete",props:{clsPrefix:{type:String,required:!0},rgba:{type:Array,default:null},displayedHue:{type:Number,required:!0},displayedSv:{type:Array,required:!0},onUpdateSV:{type:Function,required:!0},onComplete:Function},setup(e){const t=B(null);function n(o){t.value&&(_e("mousemove",document,i),_e("mouseup",document,a),i(o))}function i(o){const{value:s}=t;if(!s)return;const{width:c,height:h,left:_,bottom:A}=s.getBoundingClientRect(),d=(A-o.clientY)/h,f=(o.clientX-_)/c,L=100*(f>1?1:f<0?0:f),D=100*(d>1?1:d<0?0:d);e.onUpdateSV(L,D)}function a(){var o;xe("mousemove",document,i),xe("mouseup",document,a),(o=e.onComplete)===null||o===void 0||o.call(e)}return{palleteRef:t,handleColor:H(()=>{const{rgba:o}=e;return o?`rgb(${o[0]}, ${o[1]}, ${o[2]})`:""}),handleMouseDown:n}},render(){const{clsPrefix:e}=this;return r("div",{class:`${e}-color-picker-pallete`,onMousedown:this.handleMouseDown,ref:"palleteRef"},r("div",{class:`${e}-color-picker-pallete__layer`,style:{backgroundImage:`linear-gradient(90deg, white, hsl(${this.displayedHue}, 100%, 50%))`}}),r("div",{class:`${e}-color-picker-pallete__layer ${e}-color-picker-pallete__layer--shadowed`,style:{backgroundImage:"linear-gradient(180deg, rgba(0, 0, 0, 0%), rgba(0, 0, 0, 100%))"}}),this.rgba&&r("div",{class:`${e}-color-picker-handle`,style:{width:De,height:De,borderRadius:ze,left:`calc(${this.displayedSv[0]}% - ${ze})`,bottom:`calc(${this.displayedSv[1]}% - ${ze})`}},r("div",{class:`${e}-color-picker-handle__fill`,style:{backgroundColor:this.handleColor,borderRadius:ze,width:De,height:De}})))}}),rt=bt("n-color-picker");function Fi(e){return/^\d{1,3}\.?\d*$/.test(e.trim())?Math.max(0,Math.min(parseInt(e),255)):!1}function Ti(e){return/^\d{1,3}\.?\d*$/.test(e.trim())?Math.max(0,Math.min(parseInt(e),360)):!1}function Ni(e){return/^\d{1,3}\.?\d*$/.test(e.trim())?Math.max(0,Math.min(parseInt(e),100)):!1}function Oi(e){const t=e.trim();return/^#[0-9a-fA-F]+$/.test(t)?[4,5,7,9].includes(t.length):!1}function qi(e){return/^\d{1,3}\.?\d*%$/.test(e.trim())?Math.max(0,Math.min(parseInt(e)/100,100)):!1}const Hi={paddingSmall:"0 4px"},ht=j({name:"ColorInputUnit",props:{label:{type:String,required:!0},value:{type:[Number,String],default:null},showAlpha:Boolean,onUpdateValue:{type:Function,required:!0}},setup(e){const t=B(""),{themeRef:n}=Ve(rt,null);yt(()=>{t.value=i()});function i(){const{value:s}=e;if(s===null)return"";const{label:c}=e;return c==="HEX"?s:c==="A"?`${Math.floor(s*100)}%`:String(Math.floor(s))}function a(s){t.value=s}function o(s){let c,h;switch(e.label){case"HEX":h=Oi(s),h&&e.onUpdateValue(s),t.value=i();break;case"H":c=Ti(s),c===!1?t.value=i():e.onUpdateValue(c);break;case"S":case"L":case"V":c=Ni(s),c===!1?t.value=i():e.onUpdateValue(c);break;case"A":c=qi(s),c===!1?t.value=i():e.onUpdateValue(c);break;case"R":case"G":case"B":c=Fi(s),c===!1?t.value=i():e.onUpdateValue(c);break}}return{mergedTheme:n,inputValue:t,handleInputChange:o,handleInputUpdateValue:a}},render(){const{mergedTheme:e}=this;return r(O,{size:"small",placeholder:this.label,theme:e.peers.Input,themeOverrides:e.peerOverrides.Input,builtinThemeOverrides:Hi,value:this.inputValue,onUpdateValue:this.handleInputUpdateValue,onChange:this.handleInputChange,style:this.label==="A"?"flex-grow: 1.25;":""})}}),Ei=j({name:"ColorInput",props:{clsPrefix:{type:String,required:!0},mode:{type:String,required:!0},modes:{type:Array,required:!0},showAlpha:{type:Boolean,required:!0},value:{type:String,default:null},valueArr:{type:Array,default:null},onUpdateValue:{type:Function,required:!0},onUpdateMode:{type:Function,required:!0}},setup(e){return{handleUnitUpdateValue(t,n){const{showAlpha:i}=e;if(e.mode==="hex"){e.onUpdateValue((i?re:Ue)(n));return}let a;switch(e.valueArr===null?a=[0,0,0,0]:a=Array.from(e.valueArr),e.mode){case"hsv":a[t]=n,e.onUpdateValue((i?fe:Je)(a));break;case"rgb":a[t]=n,e.onUpdateValue((i?oe:Ye)(a));break;case"hsl":a[t]=n,e.onUpdateValue((i?le:Qe)(a));break}}}},render(){const{clsPrefix:e,modes:t}=this;return r("div",{class:`${e}-color-picker-input`},r("div",{class:`${e}-color-picker-input__mode`,onClick:this.onUpdateMode,style:{cursor:t.length===1?"":"pointer"}},this.mode.toUpperCase()+(this.showAlpha?"A":"")),r(_i,null,{default:()=>{const{mode:n,valueArr:i,showAlpha:a}=this;if(n==="hex"){let o=null;try{o=i===null?null:(a?re:Ue)(i)}catch(s){}return r(ht,{label:"HEX",showAlpha:a,value:o,onUpdateValue:s=>{this.handleUnitUpdateValue(0,s)}})}return(n+(a?"a":"")).split("").map((o,s)=>r(ht,{label:o.toUpperCase(),value:i===null?null:i[s],onUpdateValue:c=>{this.handleUnitUpdateValue(s,c)}}))}}))}}),ji=j({name:"ColorPickerTrigger",props:{clsPrefix:{type:String,required:!0},value:{type:String,default:null},hsla:{type:Array,default:null},disabled:Boolean,onClick:Function},setup(e){const{colorPickerSlots:t,renderLabelRef:n}=Ve(rt,null);return()=>{const{hsla:i,value:a,clsPrefix:o,onClick:s,disabled:c}=e,h=t.label||n.value;return r("div",{class:[`${o}-color-picker-trigger`,c&&`${o}-color-picker-trigger--disabled`],onClick:c?void 0:s},r("div",{class:`${o}-color-picker-trigger__fill`},r("div",{class:`${o}-color-picker-checkboard`}),r("div",{style:{position:"absolute",left:0,right:0,top:0,bottom:0,backgroundColor:i?le(i):""}}),a&&i?r("div",{class:`${o}-color-picker-trigger__value`,style:{color:i[2]>50||i[3]<.5?"black":"white"}},h?h(a):a):null))}}});function Li(e,t){if(t==="hsv"){const[n,i,a,o]=ve(e);return oe([...ae(n,i,a),o])}return e}function Ki(e){const t=document.createElement("canvas").getContext("2d");return t?(t.fillStyle=e,t.fillStyle):"#000000"}const Gi=j({name:"ColorPickerSwatches",props:{clsPrefix:{type:String,required:!0},mode:{type:String,required:!0},swatches:{type:Array,required:!0},onUpdateColor:{type:Function,required:!0}},setup(e){const t=H(()=>e.swatches.map(o=>{const s=Re(o);return{value:o,mode:s,legalValue:Li(o,s)}}));function n(o){const{mode:s}=e;let{value:c,mode:h}=o;return h||(h="hex",/^[a-zA-Z]+$/.test(c)?c=Ki(c):(Ot("color-picker",`color ${c} in swatches is invalid.`),c="#000000")),h===s?c:$t(c,s,h)}function i(o){e.onUpdateColor(n(o))}function a(o,s){o.key==="Enter"&&i(s)}return{parsedSwatchesRef:t,handleSwatchSelect:i,handleSwatchKeyDown:a}},render(){const{clsPrefix:e}=this;return r("div",{class:`${e}-color-picker-swatches`},this.parsedSwatchesRef.map(t=>r("div",{class:`${e}-color-picker-swatch`,tabindex:0,onClick:()=>{this.handleSwatchSelect(t)},onKeydown:n=>{this.handleSwatchKeyDown(n,t)}},r("div",{class:`${e}-color-picker-swatch__fill`,style:{background:t.legalValue}}))))}}),Xi=j({name:"ColorPreview",props:{clsPrefix:{type:String,required:!0},mode:{type:String,required:!0},color:{type:String,default:null,validator:e=>{const t=Re(e);return!!(!e||t&&t!=="hsv")}},onUpdateColor:{type:Function,required:!0}},setup(e){function t(n){var i;const a=n.target.value;(i=e.onUpdateColor)===null||i===void 0||i.call(e,$t(a.toUpperCase(),e.mode,"hex")),n.stopPropagation()}return{handleChange:t}},render(){const{clsPrefix:e}=this;return r("div",{class:`${e}-color-picker-preview__preview`},r("span",{class:`${e}-color-picker-preview__fill`,style:{background:this.color||"#000000"}}),r("input",{class:`${e}-color-picker-preview__input`,type:"color",value:this.color,onChange:this.handleChange}))}}),Zi=x([p("color-picker",`
 display: inline-block;
 box-sizing: border-box;
 height: var(--n-height);
 font-size: var(--n-font-size);
 width: 100%;
 position: relative;
 `),p("color-picker-panel",`
 margin: 4px 0;
 width: 240px;
 font-size: var(--n-panel-font-size);
 color: var(--n-text-color);
 background-color: var(--n-color);
 transition:
 box-shadow .3s var(--n-bezier),
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 border-radius: var(--n-border-radius);
 box-shadow: var(--n-box-shadow);
 `,[qt(),p("input",`
 text-align: center;
 `)]),p("color-picker-checkboard",`
 background: white; 
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `,[x("&::after",`
 background-image: linear-gradient(45deg, #DDD 25%, #0000 25%), linear-gradient(-45deg, #DDD 25%, #0000 25%), linear-gradient(45deg, #0000 75%, #DDD 75%), linear-gradient(-45deg, #0000 75%, #DDD 75%);
 background-size: 12px 12px;
 background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
 background-repeat: repeat;
 content: "";
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `)]),p("color-picker-slider",`
 margin-bottom: 8px;
 position: relative;
 box-sizing: border-box;
 `,[I("image",`
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `),x("&::after",`
 content: "";
 position: absolute;
 border-radius: inherit;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 box-shadow: inset 0 0 2px 0 rgba(0, 0, 0, .24);
 pointer-events: none;
 `)]),p("color-picker-handle",`
 z-index: 1;
 box-shadow: 0 0 2px 0 rgba(0, 0, 0, .45);
 position: absolute;
 background-color: white;
 overflow: hidden;
 `,[I("fill",`
 box-sizing: border-box;
 border: 2px solid white;
 `)]),p("color-picker-pallete",`
 height: 180px;
 position: relative;
 margin-bottom: 8px;
 cursor: crosshair;
 `,[I("layer",`
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `,[Y("shadowed",`
 box-shadow: inset 0 0 2px 0 rgba(0, 0, 0, .24);
 `)])]),p("color-picker-preview",`
 display: flex;
 `,[I("sliders",`
 flex: 1 0 auto;
 `),I("preview",`
 position: relative;
 height: 30px;
 width: 30px;
 margin: 0 0 8px 6px;
 border-radius: 50%;
 box-shadow: rgba(0, 0, 0, .15) 0px 0px 0px 1px inset;
 overflow: hidden;
 `),I("fill",`
 display: block;
 width: 30px;
 height: 30px;
 `),I("input",`
 position: absolute;
 top: 0;
 left: 0;
 width: 30px;
 height: 30px;
 opacity: 0;
 z-index: 1;
 `)]),p("color-picker-input",`
 display: flex;
 align-items: center;
 `,[p("input",`
 flex-grow: 1;
 flex-basis: 0;
 `),I("mode",`
 width: 72px;
 text-align: center;
 `)]),p("color-picker-control",`
 padding: 12px;
 `),p("color-picker-action",`
 display: flex;
 margin-top: -4px;
 border-top: 1px solid var(--n-divider-color);
 padding: 8px 12px;
 justify-content: flex-end;
 `,[p("button","margin-left: 8px;")]),p("color-picker-trigger",`
 border: var(--n-border);
 height: 100%;
 box-sizing: border-box;
 border-radius: var(--n-border-radius);
 transition: border-color .3s var(--n-bezier);
 cursor: pointer;
 `,[I("value",`
 white-space: nowrap;
 position: relative;
 `),I("fill",`
 border-radius: var(--n-border-radius);
 position: absolute;
 display: flex;
 align-items: center;
 justify-content: center;
 left: 4px;
 right: 4px;
 top: 4px;
 bottom: 4px;
 `),Y("disabled","cursor: not-allowed"),p("color-picker-checkboard",`
 border-radius: var(--n-border-radius);
 `,[x("&::after",`
 --n-block-size: calc((var(--n-height) - 8px) / 3);
 background-size: calc(var(--n-block-size) * 2) calc(var(--n-block-size) * 2);
 background-position: 0 0, 0 var(--n-block-size), var(--n-block-size) calc(-1 * var(--n-block-size)), calc(-1 * var(--n-block-size)) 0px; 
 `)])]),p("color-picker-swatches",`
 display: grid;
 grid-gap: 8px;
 flex-wrap: wrap;
 position: relative;
 grid-template-columns: repeat(auto-fill, 18px);
 margin-top: 10px;
 `,[p("color-picker-swatch",`
 width: 18px;
 height: 18px;
 background-image: linear-gradient(45deg, #DDD 25%, #0000 25%), linear-gradient(-45deg, #DDD 25%, #0000 25%), linear-gradient(45deg, #0000 75%, #DDD 75%), linear-gradient(-45deg, #0000 75%, #DDD 75%);
 background-size: 8px 8px;
 background-position: 0px 0, 0px 4px, 4px -4px, -4px 0px;
 background-repeat: repeat;
 `,[I("fill",`
 position: relative;
 width: 100%;
 height: 100%;
 border-radius: 3px;
 box-shadow: rgba(0, 0, 0, .15) 0px 0px 0px 1px inset;
 cursor: pointer;
 `),x("&:focus",`
 outline: none;
 `,[I("fill",[x("&::after",`
 position: absolute;
 top: 0;
 right: 0;
 bottom: 0;
 left: 0;
 background: inherit;
 filter: blur(2px);
 content: "";
 `)])])])])]),Wi=Object.assign(Object.assign({},Oe.props),{value:String,show:{type:Boolean,default:void 0},defaultShow:Boolean,defaultValue:String,modes:{type:Array,default:()=>["rgb","hex","hsl"]},placement:{type:String,default:"bottom-start"},to:et.propTo,showAlpha:{type:Boolean,default:!0},showPreview:Boolean,swatches:Array,disabled:{type:Boolean,default:void 0},actions:{type:Array,default:null},internalActions:Array,size:String,renderLabel:Function,onComplete:Function,onConfirm:Function,"onUpdate:show":[Function,Array],onUpdateShow:[Function,Array],"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array]}),Qi=j({name:"ColorPicker",props:Wi,setup(e,{slots:t}){const n=B(null);let i=null;const a=Ht(e),{mergedSizeRef:o,mergedDisabledRef:s}=a,{localeRef:c}=kt("global"),{mergedClsPrefixRef:h,namespaceRef:_,inlineThemeDisabled:A}=Ne(e),d=Oe("ColorPicker","-color-picker",Zi,Et,e,h);at(rt,{themeRef:d,renderLabelRef:pe(e,"renderLabel"),colorPickerSlots:t});const f=B(e.defaultShow),L=tt(pe(e,"show"),f);function D(l){const{onUpdateShow:w,"onUpdate:show":R}=e;w&&he(w,l),R&&he(R,l),f.value=l}const{defaultValue:J}=e,v=B(J===void 0?Ci(e.modes,e.showAlpha):J),$=tt(pe(e,"value"),v),T=B([$.value]),q=B(0),S=H(()=>Re($.value)),{modes:se}=e,X=B(Re($.value)||se[0]||"rgb");function Pe(){const{modes:l}=e,{value:w}=X,R=l.findIndex(P=>P===w);~R?X.value=l[(R+1)%l.length]:X.value="rgb"}let z,u,m,k,g,N,W,K;const ne=H(()=>{const{value:l}=$;if(!l)return null;switch(S.value){case"hsv":return ve(l);case"hsl":return[z,u,m,K]=ke(l),[..._t(z,u,m),K];case"rgb":case"hex":return[g,N,W,K]=te(l),[...it(g,N,W),K]}}),ue=H(()=>{const{value:l}=$;if(!l)return null;switch(S.value){case"rgb":case"hex":return te(l);case"hsv":return[z,u,k,K]=ve(l),[...ae(z,u,k),K];case"hsl":return[z,u,m,K]=ke(l),[...nt(z,u,m),K]}}),qe=H(()=>{const{value:l}=$;if(!l)return null;switch(S.value){case"hsl":return ke(l);case"hsv":return[z,u,k,K]=ve(l),[...Be(z,u,k),K];case"rgb":case"hex":return[g,N,W,K]=te(l),[...ot(g,N,W),K]}}),St=H(()=>{switch(X.value){case"rgb":case"hex":return ue.value;case"hsv":return ne.value;case"hsl":return qe.value}}),Ie=B(0),He=B(1),Ee=B([0,0]);function Ct(l,w){const{value:R}=ne,P=Ie.value,M=R?R[3]:1;Ee.value=[l,w];const{showAlpha:C}=e;switch(X.value){case"hsv":F((C?fe:Je)([P,l,w,M]),"cursor");break;case"hsl":F((C?le:Qe)([...Be(P,l,w),M]),"cursor");break;case"rgb":F((C?oe:Ye)([...ae(P,l,w),M]),"cursor");break;case"hex":F((C?re:Ue)([...ae(P,l,w),M]),"cursor");break}}function Ut(l){Ie.value=l;const{value:w}=ne;if(!w)return;const[,R,P,M]=w,{showAlpha:C}=e;switch(X.value){case"hsv":F((C?fe:Je)([l,R,P,M]),"cursor");break;case"rgb":F((C?oe:Ye)([...ae(l,R,P),M]),"cursor");break;case"hex":F((C?re:Ue)([...ae(l,R,P),M]),"cursor");break;case"hsl":F((C?le:Qe)([...Be(l,R,P),M]),"cursor");break}}function Rt(l){switch(X.value){case"hsv":[z,u,k]=ne.value,F(fe([z,u,k,l]),"cursor");break;case"rgb":[g,N,W]=ue.value,F(oe([g,N,W,l]),"cursor");break;case"hex":[g,N,W]=ue.value,F(re([g,N,W,l]),"cursor");break;case"hsl":[z,u,m]=qe.value,F(le([z,u,m,l]),"cursor");break}He.value=l}function F(l,w){w==="cursor"?i=l:i=null;const{nTriggerFormChange:R,nTriggerFormInput:P}=a,{onUpdateValue:M,"onUpdate:value":C}=e;M&&he(M,l),C&&he(C,l),R(),P(),v.value=l}function Vt(l){F(l,"input"),Wt(ge)}function ge(l=!0){const{value:w}=$;if(w){const{nTriggerFormChange:R,nTriggerFormInput:P}=a,{onComplete:M}=e;M&&M(w);const{value:C}=T,{value:G}=q;l&&(C.splice(G+1,C.length,w),q.value=G+1),R(),P()}}function Pt(){const{value:l}=q;l-1<0||(F(T.value[l-1],"input"),ge(!1),q.value=l-1)}function It(){const{value:l}=q;l<0||l+1>=T.value.length||(F(T.value[l+1],"input"),ge(!1),q.value=l+1)}function At(){F(null,"input"),D(!1)}function Dt(){const{value:l}=$,{onConfirm:w}=e;w&&w(l),D(!1)}const zt=H(()=>q.value>=1),Mt=H(()=>{const{value:l}=T;return l.length>1&&q.value<l.length-1});jt(L,l=>{l||(T.value=[$.value],q.value=0)}),yt(()=>{if(!(i&&i===$.value)){const{value:l}=ne;l&&(Ie.value=l[0],He.value=l[3],Ee.value=[l[1],l[2]])}i=null});const je=H(()=>{const{value:l}=o,{common:{cubicBezierEaseInOut:w},self:{textColor:R,color:P,panelFontSize:M,boxShadow:C,border:G,borderRadius:E,dividerColor:ce,[ut("height",l)]:Ft,[ut("fontSize",l)]:Tt}}=d.value;return{"--n-bezier":w,"--n-text-color":R,"--n-color":P,"--n-panel-font-size":M,"--n-font-size":Tt,"--n-box-shadow":C,"--n-border":G,"--n-border-radius":E,"--n-height":Ft,"--n-divider-color":ce}}),ee=A?wt("color-picker",H(()=>o.value[0]),je,e):void 0;function Bt(){var l;const{value:w}=ue,{value:R}=Ie,{internalActions:P,modes:M,actions:C}=e,{value:G}=d,{value:E}=h;return r("div",{class:[`${E}-color-picker-panel`,ee==null?void 0:ee.themeClass.value],onDragstart:ce=>{ce.preventDefault()},style:A?void 0:je.value},r("div",{class:`${E}-color-picker-control`},r(Bi,{clsPrefix:E,rgba:w,displayedHue:R,displayedSv:Ee.value,onUpdateSV:Ct,onComplete:ge}),r("div",{class:`${E}-color-picker-preview`},r("div",{class:`${E}-color-picker-preview__sliders`},r(Di,{clsPrefix:E,hue:R,onUpdateHue:Ut,onComplete:ge}),e.showAlpha?r(Mi,{clsPrefix:E,rgba:w,alpha:He.value,onUpdateAlpha:Rt,onComplete:ge}):null),e.showPreview?r(Xi,{clsPrefix:E,mode:X.value,color:ue.value&&Ue(ue.value),onUpdateColor:ce=>{F(ce,"input")}}):null),r(Ei,{clsPrefix:E,showAlpha:e.showAlpha,mode:X.value,modes:M,onUpdateMode:Pe,value:$.value,valueArr:St.value,onUpdateValue:Vt}),((l=e.swatches)===null||l===void 0?void 0:l.length)&&r(Gi,{clsPrefix:E,mode:X.value,swatches:e.swatches,onUpdateColor:ce=>{F(ce,"input")}})),C!=null&&C.length?r("div",{class:`${E}-color-picker-action`},C.includes("confirm")&&r(Q,{size:"small",onClick:Dt,theme:G.peers.Button,themeOverrides:G.peerOverrides.Button},{default:()=>c.value.confirm}),C.includes("clear")&&r(Q,{size:"small",onClick:At,disabled:!$.value,theme:G.peers.Button,themeOverrides:G.peerOverrides.Button},{default:()=>c.value.clear})):null,t.action?r("div",{class:`${E}-color-picker-action`},{default:t.action}):P?r("div",{class:`${E}-color-picker-action`},P.includes("undo")&&r(Q,{size:"small",onClick:Pt,disabled:!zt.value,theme:G.peers.Button,themeOverrides:G.peerOverrides.Button},{default:()=>c.value.undo}),P.includes("redo")&&r(Q,{size:"small",onClick:It,disabled:!Mt.value,theme:G.peers.Button,themeOverrides:G.peerOverrides.Button},{default:()=>c.value.redo})):null)}return{mergedClsPrefix:h,namespace:_,selfRef:n,hsla:qe,rgba:ue,mergedShow:L,mergedDisabled:s,isMounted:Lt(),adjustedTo:et(e),mergedValue:$,handleTriggerClick(){D(!0)},handleClickOutside(l){var w;!((w=n.value)===null||w===void 0)&&w.contains(Kt(l))||D(!1)},renderPanel:Bt,cssVars:A?void 0:je,themeClass:ee==null?void 0:ee.themeClass,onRender:ee==null?void 0:ee.onRender}},render(){const{$slots:e,mergedClsPrefix:t,onRender:n}=this;return n==null||n(),r("div",{class:[this.themeClass,`${t}-color-picker`],ref:"selfRef",style:this.cssVars},r(ci,null,{default:()=>[r(di,null,{default:()=>r(ji,{clsPrefix:t,value:this.mergedValue,hsla:this.hsla,disabled:this.mergedDisabled,onClick:this.handleTriggerClick},{label:e.label})}),r(mi,{placement:this.placement,show:this.mergedShow,containerClass:this.namespace,teleportDisabled:this.adjustedTo===et.tdkey,to:this.adjustedTo},{default:()=>r(Gt,{name:"fade-in-scale-up-transition",appear:this.isMounted},{default:()=>this.mergedShow?Xt(this.renderPanel(),[[Zt,this.handleClickOutside,void 0,{capture:!0}]]):null})})]}))}}),Yi=()=>ti,Ji=Qt({name:"DynamicInput",common:Yt,peers:{Input:Jt,Button:ei},self:Yi}),eo=Ji,lt=bt("n-dynamic-input"),to=j({name:"DynamicInputInputPreset",props:{clsPrefix:{type:String,required:!0},value:{type:String,default:""},disabled:Boolean,parentPath:String,path:String,onUpdateValue:{type:Function,required:!0}},setup(){const{mergedThemeRef:e,placeholderRef:t}=Ve(lt);return{mergedTheme:e,placeholder:t}},render(){const{mergedTheme:e,placeholder:t,value:n,clsPrefix:i,onUpdateValue:a,disabled:o}=this;return r("div",{class:`${i}-dynamic-input-preset-input`},r(O,{theme:e.peers.Input,"theme-overrides":e.peerOverrides.Input,value:n,placeholder:t,onUpdateValue:a,disabled:o}))}}),io=j({name:"DynamicInputPairPreset",props:{clsPrefix:{type:String,required:!0},value:{type:Object,default:()=>({key:"",value:""})},disabled:Boolean,parentPath:String,path:String,onUpdateValue:{type:Function,required:!0}},setup(e){const{mergedThemeRef:t,keyPlaceholderRef:n,valuePlaceholderRef:i}=Ve(lt);return{mergedTheme:t,keyPlaceholder:n,valuePlaceholder:i,handleKeyInput(a){e.onUpdateValue({key:a,value:e.value.value})},handleValueInput(a){e.onUpdateValue({key:e.value.key,value:a})}}},render(){const{mergedTheme:e,keyPlaceholder:t,valuePlaceholder:n,value:i,clsPrefix:a,disabled:o}=this;return r("div",{class:`${a}-dynamic-input-preset-pair`},r(O,{theme:e.peers.Input,"theme-overrides":e.peerOverrides.Input,value:i.key,class:`${a}-dynamic-input-pair-input`,placeholder:t,onUpdateValue:this.handleKeyInput,disabled:o}),r(O,{theme:e.peers.Input,"theme-overrides":e.peerOverrides.Input,value:i.value,class:`${a}-dynamic-input-pair-input`,placeholder:n,onUpdateValue:this.handleValueInput,disabled:o}))}}),oo=p("dynamic-input",{width:"100%"},[p("dynamic-input-item",`
 margin-bottom: 10px;
 display: flex;
 flex-wrap: nowrap;
 `,[p("dynamic-input-preset-input",{flex:1,alignItems:"center"}),p("dynamic-input-preset-pair",`
 flex: 1;
 display: flex;
 align-items: center;
 `,[p("dynamic-input-pair-input",[x("&:first-child",{"margin-right":"12px"})])]),I("action",`
 align-self: flex-start;
 display: flex;
 justify-content: flex-end;
 flex-shrink: 0;
 flex-grow: 0;
 margin: var(--action-margin);
 `,[Y("icon",{cursor:"pointer"})]),x("&:last-child",{marginBottom:0})]),p("form-item",`
 padding-top: 0 !important;
 margin-right: 0 !important;
 `,[p("form-item-blank",{paddingTop:"0 !important"})])]),Me=new WeakMap,no=Object.assign(Object.assign({},Oe.props),{max:Number,min:{type:Number,default:0},value:Array,defaultValue:{type:Array,default:()=>[]},preset:{type:String,default:"input"},keyField:String,itemClass:String,itemStyle:[String,Object],keyPlaceholder:{type:String,default:""},valuePlaceholder:{type:String,default:""},placeholder:{type:String,default:""},disabled:Boolean,showSortButton:Boolean,createButtonProps:Object,onCreate:Function,onRemove:Function,"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array],onClear:Function,onInput:[Function,Array]}),ao=j({name:"DynamicInput",props:no,setup(e,{slots:t}){const{mergedComponentPropsRef:n,mergedClsPrefixRef:i,mergedRtlRef:a,inlineThemeDisabled:o}=Ne(),s=Ve(ii,null),c=B(e.defaultValue),h=pe(e,"value"),_=tt(h,c),A=Oe("DynamicInput","-dynamic-input",oo,eo,e,i),d=H(()=>{const{value:u}=_;if(Array.isArray(u)){const{max:m}=e;return m!==void 0&&u.length>=m}return!1}),f=H(()=>{const{value:u}=_;return Array.isArray(u)?u.length<=e.min:!0}),L=H(()=>{var u,m;return(m=(u=n==null?void 0:n.value)===null||u===void 0?void 0:u.DynamicInput)===null||m===void 0?void 0:m.buttonSize});function D(u){const{onInput:m,"onUpdate:value":k,onUpdateValue:g}=e;m&&he(m,u),k&&he(k,u),g&&he(g,u),c.value=u}function J(u,m){if(u==null||typeof u!="object")return m;const k=Ge(u)?Xe(u):u;let g=Me.get(k);return g===void 0&&Me.set(k,g=oi()),g}function v(u,m){const{value:k}=_,g=Array.from(k!=null?k:[]),N=g[u];if(g[u]=m,N&&m&&typeof N=="object"&&typeof m=="object"){const W=Ge(N)?Xe(N):N,K=Ge(m)?Xe(m):m,ne=Me.get(W);ne!==void 0&&Me.set(K,ne)}D(g)}function $(){T(-1)}function T(u){const{value:m}=_,{onCreate:k}=e,g=Array.from(m!=null?m:[]);if(k)g.splice(u+1,0,k(u+1)),D(g);else if(t.default)g.splice(u+1,0,null),D(g);else switch(e.preset){case"input":g.splice(u+1,0,""),D(g);break;case"pair":g.splice(u+1,0,{key:"",value:""}),D(g);break}}function q(u){const{value:m}=_;if(!Array.isArray(m))return;const{min:k}=e;if(m.length<=k)return;const{onRemove:g}=e;g&&g(u);const N=Array.from(m);N.splice(u,1),D(N)}function S(u,m,k){if(m<0||k<0||m>=u.length||k>=u.length||m===k)return;const g=u[m];u[m]=u[k],u[k]=g}function se(u,m){const{value:k}=_;if(!Array.isArray(k))return;const g=Array.from(k);u==="up"&&S(g,m,m-1),u==="down"&&S(g,m,m+1),D(g)}at(lt,{mergedThemeRef:A,keyPlaceholderRef:pe(e,"keyPlaceholder"),valuePlaceholderRef:pe(e,"valuePlaceholder"),placeholderRef:pe(e,"placeholder")});const X=gt("DynamicInput",a,i),Pe=H(()=>{const{self:{actionMargin:u,actionMarginRtl:m}}=A.value;return{"--action-margin":u,"--action-margin-rtl":m}}),z=o?wt("dynamic-input",void 0,Pe,e):void 0;return{locale:kt("DynamicInput").localeRef,rtlEnabled:X,buttonSize:L,mergedClsPrefix:i,NFormItem:s,uncontrolledValue:c,mergedValue:_,insertionDisabled:d,removeDisabled:f,handleCreateClick:$,ensureKey:J,handleValueChange:v,remove:q,move:se,createItem:T,mergedTheme:A,cssVars:o?void 0:Pe,themeClass:z==null?void 0:z.themeClass,onRender:z==null?void 0:z.onRender}},render(){const{$slots:e,itemClass:t,buttonSize:n,mergedClsPrefix:i,mergedValue:a,locale:o,mergedTheme:s,keyField:c,itemStyle:h,preset:_,showSortButton:A,NFormItem:d,ensureKey:f,handleValueChange:L,remove:D,createItem:J,move:v,onRender:$,disabled:T}=this;return $==null||$(),r("div",{class:[`${i}-dynamic-input`,this.rtlEnabled&&`${i}-dynamic-input--rtl`,this.themeClass],style:this.cssVars},!Array.isArray(a)||a.length===0?r(Q,Object.assign({block:!0,ghost:!0,dashed:!0,size:n},this.createButtonProps,{disabled:this.insertionDisabled||T,theme:s.peers.Button,themeOverrides:s.peerOverrides.Button,onClick:this.handleCreateClick}),{default:()=>ct(e["create-button-default"],()=>[o.create]),icon:()=>ct(e["create-button-icon"],()=>[r($e,{clsPrefix:i},{default:()=>r(pt,null)})])}):a.map((q,S)=>r("div",{key:c?q[c]:f(q,S),"data-key":c?q[c]:f(q,S),class:[`${i}-dynamic-input-item`,t],style:h},dt(e.default,{value:a[S],index:S},()=>[_==="input"?r(to,{disabled:T,clsPrefix:i,value:a[S],parentPath:d?d.path.value:void 0,path:d!=null&&d.path.value?`${d.path.value}[${S}]`:void 0,onUpdateValue:se=>{L(S,se)}}):_==="pair"?r(io,{disabled:T,clsPrefix:i,value:a[S],parentPath:d?d.path.value:void 0,path:d!=null&&d.path.value?`${d.path.value}[${S}]`:void 0,onUpdateValue:se=>{L(S,se)}}):null]),dt(e.action,{value:a[S],index:S,create:J,remove:D,move:v},()=>[r("div",{class:`${i}-dynamic-input-item__action`},r(Si,{size:n},{default:()=>[r(Q,{disabled:this.removeDisabled||T,theme:s.peers.Button,themeOverrides:s.peerOverrides.Button,circle:!0,onClick:()=>{D(S)}},{icon:()=>r($e,{clsPrefix:i},{default:()=>r(gi,null)})}),r(Q,{disabled:this.insertionDisabled||T,circle:!0,theme:s.peers.Button,themeOverrides:s.peerOverrides.Button,onClick:()=>{J(S)}},{icon:()=>r($e,{clsPrefix:i},{default:()=>r(pt,null)})}),A?r(Q,{disabled:S===0||T,circle:!0,theme:s.peers.Button,themeOverrides:s.peerOverrides.Button,onClick:()=>{v("up",S)}},{icon:()=>r($e,{clsPrefix:i},{default:()=>r(yi,null)})}):null,A?r(Q,{disabled:S===a.length-1||T,circle:!0,theme:s.peers.Button,themeOverrides:s.peerOverrides.Button,onClick:()=>{v("down",S)}},{icon:()=>r($e,{clsPrefix:i},{default:()=>r(bi,null)})}):null]}))]))))}}),ft=["mdi-air-humidifier-off","mdi-chili-off","mdi-cigar-off","mdi-clock-time-eight","mdi-clock-time-eight-outline","mdi-clock-time-eleven","mdi-clock-time-eleven-outline","mdi-clock-time-five","mdi-clock-time-five-outline","mdi-clock-time-four","mdi-clock-time-four-outline","mdi-clock-time-nine","mdi-clock-time-nine-outline","mdi-clock-time-one","mdi-clock-time-one-outline","mdi-clock-time-seven","mdi-clock-time-seven-outline","mdi-clock-time-six","mdi-clock-time-six-outline","mdi-clock-time-ten","mdi-clock-time-ten-outline","mdi-clock-time-three","mdi-clock-time-three-outline","mdi-clock-time-twelve","mdi-clock-time-twelve-outline","mdi-clock-time-two","mdi-clock-time-two-outline","mdi-cog-refresh","mdi-cog-refresh-outline","mdi-cog-sync","mdi-cog-sync-outline","mdi-content-save-cog","mdi-content-save-cog-outline","mdi-cosine-wave","mdi-cube-off","mdi-cube-off-outline","mdi-dome-light","mdi-download-box","mdi-download-box-outline","mdi-download-circle","mdi-download-circle-outline","mdi-fan-alert","mdi-fan-chevron-down","mdi-fan-chevron-up","mdi-fan-minus","mdi-fan-plus","mdi-fan-remove","mdi-fan-speed-1","mdi-fan-speed-2","mdi-fan-speed-3","mdi-food-drumstick","mdi-food-drumstick-off","mdi-food-drumstick-off-outline","mdi-food-drumstick-outline","mdi-food-steak","mdi-food-steak-off","mdi-fuse-alert","mdi-fuse-off","mdi-heart-minus","mdi-heart-minus-outline","mdi-heart-off-outline","mdi-heart-plus","mdi-heart-plus-outline","mdi-heart-remove","mdi-heart-remove-outline","mdi-hours-24","mdi-incognito-circle","mdi-incognito-circle-off","mdi-lingerie","mdi-microwave-off","mdi-minus-circle-off","mdi-minus-circle-off-outline","mdi-motion-sensor-off","mdi-pail-minus","mdi-pail-minus-outline","mdi-pail-off","mdi-pail-off-outline","mdi-pail-outline","mdi-pail-plus","mdi-pail-plus-outline","mdi-pail-remove","mdi-pail-remove-outline","mdi-pine-tree-fire","mdi-power-plug-off-outline","mdi-power-plug-outline","mdi-printer-eye","mdi-printer-search","mdi-puzzle-check","mdi-puzzle-check-outline","mdi-rug","mdi-sawtooth-wave","mdi-set-square","mdi-smoking-pipe-off","mdi-spoon-sugar","mdi-square-wave","mdi-table-split-cell","mdi-ticket-percent-outline","mdi-triangle-wave","mdi-waveform","mdi-wizard-hat","mdi-ab-testing","mdi-abjad-arabic","mdi-abjad-hebrew","mdi-abugida-devanagari","mdi-abugida-thai","mdi-access-point","mdi-access-point-network","mdi-access-point-network-off","mdi-account","mdi-account-alert","mdi-account-alert-outline","mdi-account-arrow-left","mdi-account-arrow-left-outline","mdi-account-arrow-right","mdi-account-arrow-right-outline","mdi-account-box","mdi-account-box-multiple","mdi-account-box-multiple-outline","mdi-account-box-outline","mdi-account-cancel","mdi-account-cancel-outline","mdi-account-cash","mdi-account-cash-outline","mdi-account-check","mdi-account-check-outline","mdi-account-child","mdi-account-child-circle","mdi-account-child-outline","mdi-account-circle","mdi-account-circle-outline","mdi-account-clock","mdi-account-clock-outline","mdi-account-cog","mdi-account-cog-outline","mdi-account-convert","mdi-account-convert-outline","mdi-account-cowboy-hat","mdi-account-details","mdi-account-details-outline","mdi-account-edit","mdi-account-edit-outline","mdi-account-group","mdi-account-group-outline","mdi-account-hard-hat","mdi-account-heart","mdi-account-heart-outline","mdi-account-key","mdi-account-key-outline","mdi-account-lock","mdi-account-lock-outline","mdi-account-minus","mdi-account-minus-outline","mdi-account-multiple","mdi-account-multiple-check","mdi-account-multiple-check-outline","mdi-account-multiple-minus","mdi-account-multiple-minus-outline","mdi-account-multiple-outline","mdi-account-multiple-plus","mdi-account-multiple-plus-outline","mdi-account-multiple-remove","mdi-account-multiple-remove-outline","mdi-account-music","mdi-account-music-outline","mdi-account-network","mdi-account-network-outline","mdi-account-off","mdi-account-off-outline","mdi-account-outline","mdi-account-plus","mdi-account-plus-outline","mdi-account-question","mdi-account-question-outline","mdi-account-remove","mdi-account-remove-outline","mdi-account-search","mdi-account-search-outline","mdi-account-settings","mdi-account-settings-outline","mdi-account-star","mdi-account-star-outline","mdi-account-supervisor","mdi-account-supervisor-circle","mdi-account-supervisor-outline","mdi-account-switch","mdi-account-switch-outline","mdi-account-tie","mdi-account-tie-outline","mdi-account-tie-voice","mdi-account-tie-voice-off","mdi-account-tie-voice-off-outline","mdi-account-tie-voice-outline","mdi-account-voice","mdi-adjust","mdi-adobe","mdi-adobe-acrobat","mdi-air-conditioner","mdi-air-filter","mdi-air-horn","mdi-air-humidifier","mdi-air-purifier","mdi-airbag","mdi-airballoon","mdi-airballoon-outline","mdi-airplane","mdi-airplane-landing","mdi-airplane-off","mdi-airplane-takeoff","mdi-airport","mdi-alarm","mdi-alarm-bell","mdi-alarm-check","mdi-alarm-light","mdi-alarm-light-outline","mdi-alarm-multiple","mdi-alarm-note","mdi-alarm-note-off","mdi-alarm-off","mdi-alarm-plus","mdi-alarm-snooze","mdi-album","mdi-alert","mdi-alert-box","mdi-alert-box-outline","mdi-alert-circle","mdi-alert-circle-check","mdi-alert-circle-check-outline","mdi-alert-circle-outline"],ro={class:"w-full"},lo=Te("span",{class:"i-mdi:magnify text-18"},null,-1),so=Te("a",{class:"text-blue",target:"_blank",href:"https://icones.js.org/collection/all"}," Icones ",-1),uo={key:0,class:"h-150 w-300 overflow-y-scroll"},co=["onClick"],mo={key:1},po={__name:"IconPicker",props:{value:String},emits:["update:value"],setup(e,{emit:t}){const n=e,i=t,a=B(n.value),o=B(ft);function s(){o.value=ft.filter(h=>h.includes(a.value))}function c(h){a.value=h,i("update:value",a.value)}return ni(a,()=>{s(),i("update:value",a.value)},{debounce:200}),(h,_)=>(ie(),Se("div",ro,[b(y(pi),{trigger:"click",placement:"bottom-start"},{trigger:V(()=>[b(y(O),{value:a.value,"onUpdate:value":[_[0]||(_[0]=A=>a.value=A),s],placeholder:"请输入图标名称"},{prefix:V(()=>[lo]),suffix:V(()=>[b(Ke,{icon:a.value,size:18},null,8,["icon"])]),_:1},8,["value"])]),footer:V(()=>[Fe(" 更多图标去 "),so,Fe(" 查看 ")]),default:V(()=>[o.value.length?(ie(),Se("ul",uo,[(ie(!0),Se(ai,null,ri(o.value,(A,d)=>(ie(),Se("li",{key:d,class:"mx-5 inline-block cursor-pointer hover:text-cyan",onClick:f=>c(A)},[b(Ke,{icon:A,size:18},null,8,["icon"])],8,co))),128))])):(ie(),Se("div",mo,[b(Ke,{icon:a.value,size:18},null,8,["icon"])]))]),_:1})]))}};const ho={class:"m-30 flex items-center"},fo={style:{display:"flex","align-items":"center",width:"100%"}},vo={__name:"index",setup(e){var A;const{t}=li(),n=si(),i=B(!1),a=B(null),o=B({site_url:n.metaSetting.site_url,site_keywords:n.metaSetting.site_keywords,site_name:n.metaSetting.site_name,site_desc:n.metaSetting.site_desc,primary_color:n.metaSetting.primary_color,site_splitter:n.metaSetting.site_splitter,site_icon:n.metaSetting.site_icon,site_apple_icon:n.metaSetting.site_apple_icon,bottom_icon:n.metaSetting.bottom_icon,bottom_desc:n.metaSetting.bottom_desc,icp:n.metaSetting.icp,entries:(A=n.metaSetting.entries)!=null?A:[{name:"",icon:"",url:""}]});function s(){return Le(this,null,function*(){var d;i.value=!0,(d=a.value)==null||d.validate(f=>Le(this,null,function*(){if(!f){var L=n.totalSetting;L.meta=o.value,yield ui.updateSetting(L).then(()=>{n.setMetaSetting(o.value),i.value=!1,$message.success(t("common.text.save_success"))}).catch(()=>{i.value=!1})}}))})}const c={};function h(){return{name:"",icon:"",url:""}}const _="#20809F";return(d,f)=>{const L=Qi,D=po,J=ao;return ie(),Ae(hi,{title:d.$t("views.setting.label_meta_setting")},{default:V(()=>[Te("div",ho,[b(y(fi),{ref_key:"infoFormRef",ref:a,"label-placement":"top","label-align":"left","label-width":"100",model:o.value,rules:c,class:"w-500"},{default:V(()=>[b(y(Z),{label:d.$t("views.setting.label_site_url"),path:"site_url"},{default:V(()=>[b(y(O),{value:o.value.site_url,"onUpdate:value":f[0]||(f[0]=v=>o.value.site_url=v),type:"text",placeholder:d.$t("views.setting.placeholder_site_url"),clearable:""},null,8,["value","placeholder"])]),_:1},8,["label"]),b(y(Z),{label:d.$t("views.setting.label_site_name"),path:"site_name"},{default:V(()=>[b(y(O),{value:o.value.site_name,"onUpdate:value":f[1]||(f[1]=v=>o.value.site_name=v),type:"text",placeholder:d.$t("views.setting.placeholder_site_name"),clearable:""},null,8,["value","placeholder"])]),_:1},8,["label"]),b(y(Z),{label:d.$t("views.setting.label_site_splitter"),path:"site_splitter"},{default:V(()=>[b(y(O),{value:o.value.site_splitter,"onUpdate:value":f[2]||(f[2]=v=>o.value.site_splitter=v),type:"text",placeholder:d.$t("views.setting.placeholder_site_splitter"),clearable:""},null,8,["value","placeholder"])]),_:1},8,["label"]),b(y(Z),{label:d.$t("views.setting.label_site_desc"),path:"site_desc"},{default:V(()=>[b(y(O),{value:o.value.site_desc,"onUpdate:value":f[3]||(f[3]=v=>o.value.site_desc=v),type:"text",placeholder:d.$t("views.setting.placeholder_site_desc"),clearable:""},null,8,["value","placeholder"])]),_:1},8,["label"]),b(y(Z),{label:d.$t("views.setting.label_site_keywords"),path:"site_keywords"},{default:V(()=>[b(y(O),{value:o.value.site_keywords,"onUpdate:value":f[4]||(f[4]=v=>o.value.site_keywords=v),type:"text",placeholder:d.$t("views.setting.placeholder_site_keywords"),clearable:""},null,8,["value","placeholder"])]),_:1},8,["label"]),b(y(Z),{label:d.$t("views.setting.label_site_icon"),path:"site_icon"},{default:V(()=>[b(y(O),{value:o.value.site_icon,"onUpdate:value":f[5]||(f[5]=v=>o.value.site_icon=v),type:"text",placeholder:d.$t("views.setting.placeholder_site_icon"),clearable:""},null,8,["value","placeholder"])]),_:1},8,["label"]),o.value.site_icon!=null&&o.value.site_icon!=""?(ie(),Ae(y(We),{key:0,width:"50",src:o.value.site_icon,class:"icon"},null,8,["src"])):Ze("",!0),b(y(Z),{label:d.$t("views.setting.label_site_apple_icon"),path:"site_apple_icon"},{default:V(()=>[b(y(O),{value:o.value.site_apple_icon,"onUpdate:value":f[6]||(f[6]=v=>o.value.site_apple_icon=v),type:"text",placeholder:d.$t("views.setting.placeholder_site_apple_icon"),clearable:""},null,8,["value","placeholder"])]),_:1},8,["label"]),o.value.site_apple_icon!=null&&o.value.site_apple_icon!=""?(ie(),Ae(y(We),{key:1,width:"50",src:o.value.site_apple_icon,class:"icon"},null,8,["src"])):Ze("",!0),b(y(Z),{label:d.$t("views.setting.label_bottom_icon"),path:"bottom_icon"},{default:V(()=>[b(y(O),{value:o.value.bottom_icon,"onUpdate:value":f[7]||(f[7]=v=>o.value.bottom_icon=v),type:"text",placeholder:d.$t("views.setting.placeholder_bottom_icon"),clearable:""},null,8,["value","placeholder"])]),_:1},8,["label"]),o.value.bottom_icon!=null&&o.value.bottom_icon!=""?(ie(),Ae(y(We),{key:2,width:"50",src:o.value.bottom_icon,class:"icon"},null,8,["src"])):Ze("",!0),b(y(Z),{label:d.$t("views.setting.label_bottom_desc"),path:"bottom_desc"},{default:V(()=>[b(y(O),{value:o.value.bottom_desc,"onUpdate:value":f[8]||(f[8]=v=>o.value.bottom_desc=v),type:"text",placeholder:d.$t("views.setting.placeholder_bottom_desc"),clearable:""},null,8,["value","placeholder"])]),_:1},8,["label"]),b(y(Z),{label:d.$t("views.setting.label_primary_color"),path:"primary_color"},{default:V(()=>[b(L,{value:o.value.primary_color,"onUpdate:value":f[9]||(f[9]=v=>o.value.primary_color=v),"show-alpha":!1,"default-value":y(_),class:"w-200"},null,8,["value","default-value"])]),_:1},8,["label"]),b(y(Z),{label:d.$t("views.setting.label_icp"),path:"icp"},{default:V(()=>[b(y(O),{value:o.value.icp,"onUpdate:value":f[10]||(f[10]=v=>o.value.icp=v),type:"text",placeholder:d.$t("views.setting.placeholder_icp"),clearable:""},null,8,["value","placeholder"])]),_:1},8,["label"]),b(y(Z),{label:d.$t("views.setting.label_entries"),path:"entries",class:"w-800"},{default:V(()=>[b(J,{value:o.value.entries,"onUpdate:value":f[11]||(f[11]=v=>o.value.entries=v),"on-create":h},{"create-button-default":V(()=>[Fe(mt(y(t)("views.setting.label_create_entries")),1)]),default:V(({value:v})=>[Te("div",fo,[b(y(O),{value:v.name,"onUpdate:value":$=>v.name=$,placeholder:d.$t("views.setting.placeholder_entry_name"),type:"text",style:{"margin-left":"5px"}},null,8,["value","onUpdate:value","placeholder"]),b(D,{value:v.icon,"onUpdate:value":$=>v.icon=$,style:{"margin-left":"5px"}},null,8,["value","onUpdate:value"]),b(y(O),{value:v.url,"onUpdate:value":$=>v.url=$,placeholder:d.$t("views.setting.placeholder_entry_url"),type:"text",style:{"margin-left":"5px"}},null,8,["value","onUpdate:value","placeholder"])])]),_:1},8,["value"])]),_:1},8,["label"]),b(y(Q),{type:"primary",loading:i.value,onClick:s},{default:V(()=>[Fe(mt(d.$t("common.buttons.save")),1)]),_:1},8,["loading"])]),_:1},8,["model"])])]),_:1},8,["title"])}}},Ao=vi(vo,[["__scopeId","data-v-4f73199d"]]);export{Ao as default};
