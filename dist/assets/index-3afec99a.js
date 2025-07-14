var At=Object.defineProperty,Et=Object.defineProperties;var kt=Object.getOwnPropertyDescriptors;var Be=Object.getOwnPropertySymbols;var It=Object.prototype.hasOwnProperty,jt=Object.prototype.propertyIsEnumerable;var Ae=(e,r,o)=>r in e?At(e,r,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[r]=o,fe=(e,r)=>{for(var o in r||(r={}))It.call(r,o)&&Ae(e,o,r[o]);if(Be)for(var o of Be(r))jt.call(r,o)&&Ae(e,o,r[o]);return e},be=(e,r)=>Et(e,kt(r));var K=(e,r,o)=>new Promise((g,i)=>{var _=m=>{try{h(o.next(m))}catch(x){i(x)}},f=m=>{try{h(o.throw(m))}catch(x){i(x)}},h=m=>m.done?g(m.value):Promise.resolve(m.value).then(_,f);h((o=o.apply(e,r)).next())});import{d as ie,r as W,aI as Ft,h as v,aJ as Ot,aK as se,aL as Nt,k as Ht,n as qe,aM as Mt,i as oe,aH as Dt,F as Ut,z as Vt,B as qt,aN as Xt,aO as Gt,c as n,b as c,a as T,e as F,H as Kt,u as Yt,f as Xe,aP as ue,aa as pe,o as Jt,p as Qt,t as N,K as Zt,aQ as H,aR as ae,j as ea,aE as Ee,V as ve,aS as ta,A as re,aT as aa,ab as ge,a7 as ra,a8 as na,aU as oa,aV as sa,a4 as ia,a0 as la,a1 as da,P as he,Q as me,R as I,$ as z,U as C,Z as ca,as as ne,aG as xe,X as ye,ae as ke,Y as Ie}from"./index-e858760b.js";import{_ as fa,N as je,a as Y}from"./CommonPage-7f9158f9.js";import{_ as ba}from"./_plugin-vue_export-helper-c27b6911.js";import{N as J}from"./Input-dbf813c2.js";import{A as ua}from"./Add-bcf4f7e7.js";import{c as pa,a as Fe,u as Oe,o as va}from"./Popover-8aa39b13.js";import{u as ga}from"./use-locale-aaabd27b.js";import{_ as ha}from"./Upload-aaa10082.js";import{N as ma}from"./Image-ae20ce94.js";import"./format-length-c9d165c6.js";import"./AppPage-280c836e.js";import"./Tooltip-1357a659.js";const xa=Fe(".v-x-scroll",{overflow:"auto",scrollbarWidth:"none"},[Fe("&::-webkit-scrollbar",{width:0,height:0})]),ya=ie({name:"XScroll",props:{disabled:Boolean,onScroll:Function},setup(){const e=W(null);function r(i){!(i.currentTarget.offsetWidth<i.currentTarget.scrollWidth)||i.deltaY===0||(i.currentTarget.scrollLeft+=i.deltaY+i.deltaX,i.preventDefault())}const o=Ft();return xa.mount({id:"vueuc/x-scroll",head:!0,anchorMetaName:pa,ssr:o}),Object.assign({selfRef:e,handleWheel:r},{scrollTo(...i){var _;(_=e.value)===null||_===void 0||_.scrollTo(...i)}})},render(){return v("div",{ref:"selfRef",onScroll:this.onScroll,onWheel:this.disabled?void 0:this.handleWheel,class:"v-x-scroll"},this.$slots)}});var wa=/\s/;function _a(e){for(var r=e.length;r--&&wa.test(e.charAt(r)););return r}var Sa=/^\s+/;function Ca(e){return e&&e.slice(0,_a(e)+1).replace(Sa,"")}var Ne=0/0,$a=/^[-+]0x[0-9a-f]+$/i,Ra=/^0b[01]+$/i,Ta=/^0o[0-7]+$/i,za=parseInt;function He(e){if(typeof e=="number")return e;if(Ot(e))return Ne;if(se(e)){var r=typeof e.valueOf=="function"?e.valueOf():e;e=se(r)?r+"":r}if(typeof e!="string")return e===0?e:+e;e=Ca(e);var o=Ra.test(e);return o||Ta.test(e)?za(e.slice(2),o?2:8):$a.test(e)?Ne:+e}var Pa=function(){return Nt.Date.now()};const we=Pa;var Wa="Expected a function",La=Math.max,Ba=Math.min;function Aa(e,r,o){var g,i,_,f,h,m,x=0,b=!1,A=!1,E=!0;if(typeof e!="function")throw new TypeError(Wa);r=He(r)||0,se(o)&&(b=!!o.leading,A="maxWait"in o,_=A?La(He(o.maxWait)||0,r):_,E="trailing"in o?!!o.trailing:E);function S(p){var P=g,M=i;return g=i=void 0,x=p,f=e.apply(M,P),f}function L(p){return x=p,h=setTimeout(l,r),b?S(p):f}function $(p){var P=p-m,M=p-x,U=r-P;return A?Ba(U,_-M):U}function B(p){var P=p-m,M=p-x;return m===void 0||P>=r||P<0||A&&M>=_}function l(){var p=we();if(B(p))return d(p);h=setTimeout(l,$(p))}function d(p){return h=void 0,E&&g?S(p):(g=i=void 0,f)}function k(){h!==void 0&&clearTimeout(h),x=0,g=m=i=h=void 0}function y(){return h===void 0?f:d(we())}function w(){var p=we(),P=B(p);if(g=arguments,i=this,m=p,P){if(h===void 0)return L(m);if(A)return clearTimeout(h),h=setTimeout(l,r),S(m)}return h===void 0&&(h=setTimeout(l,r)),f}return w.cancel=k,w.flush=y,w}var Ea="Expected a function";function _e(e,r,o){var g=!0,i=!0;if(typeof e!="function")throw new TypeError(Ea);return se(o)&&(g="leading"in o?!!o.leading:g,i="trailing"in o?!!o.trailing:i),Aa(e,r,{leading:g,maxWait:r,trailing:i})}const $e=Ht("n-tabs"),Ge={tab:[String,Number,Object,Function],name:{type:[String,Number],required:!0},disabled:Boolean,displayDirective:{type:String,default:"if"},closable:{type:Boolean,default:void 0},tabProps:Object,label:[String,Number,Object,Function]},Me=ie({__TAB_PANE__:!0,name:"TabPane",alias:["TabPanel"],props:Ge,setup(e){const r=qe($e,null);return r||Mt("tab-pane","`n-tab-pane` must be placed inside `n-tabs`."),{style:r.paneStyleRef,class:r.paneClassRef,mergedClsPrefix:r.mergedClsPrefixRef}},render(){return v("div",{class:[`${this.mergedClsPrefix}-tab-pane`,this.class],style:this.style},this.$slots)}}),ka=Object.assign({internalLeftPadded:Boolean,internalAddable:Boolean,internalCreatedByPane:Boolean},Gt(Ge,["displayDirective"])),Ce=ie({__TAB__:!0,inheritAttrs:!1,name:"Tab",props:ka,setup(e){const{mergedClsPrefixRef:r,valueRef:o,typeRef:g,closableRef:i,tabStyleRef:_,addTabStyleRef:f,tabClassRef:h,addTabClassRef:m,tabChangeIdRef:x,onBeforeLeaveRef:b,triggerRef:A,handleAdd:E,activateTab:S,handleClose:L}=qe($e);return{trigger:A,mergedClosable:oe(()=>{if(e.internalAddable)return!1;const{closable:$}=e;return $===void 0?i.value:$}),style:_,addStyle:f,tabClass:h,addTabClass:m,clsPrefix:r,value:o,type:g,handleClose($){$.stopPropagation(),!e.disabled&&L(e.name)},activateTab(){if(e.disabled)return;if(e.internalAddable){E();return}const{name:$}=e,B=++x.id;if($!==o.value){const{value:l}=b;l?Promise.resolve(l(e.name,o.value)).then(d=>{d&&x.id===B&&S($)}):S($)}}}},render(){const{internalAddable:e,clsPrefix:r,name:o,disabled:g,label:i,tab:_,value:f,mergedClosable:h,trigger:m,$slots:{default:x}}=this,b=i!=null?i:_;return v("div",{class:`${r}-tabs-tab-wrapper`},this.internalLeftPadded?v("div",{class:`${r}-tabs-tab-pad`}):null,v("div",Object.assign({key:o,"data-name":o,"data-disabled":g?!0:void 0},Dt({class:[`${r}-tabs-tab`,f===o&&`${r}-tabs-tab--active`,g&&`${r}-tabs-tab--disabled`,h&&`${r}-tabs-tab--closable`,e&&`${r}-tabs-tab--addable`,e?this.addTabClass:this.tabClass],onClick:m==="click"?this.activateTab:void 0,onMouseenter:m==="hover"?this.activateTab:void 0,style:e?this.addStyle:this.style},this.internalCreatedByPane?this.tabProps||{}:this.$attrs)),v("span",{class:`${r}-tabs-tab__label`},e?v(Ut,null,v("div",{class:`${r}-tabs-tab__height-placeholder`}," "),v(Vt,{clsPrefix:r},{default:()=>v(ua,null)})):x?x():typeof b=="object"?b:qt(b!=null?b:o)),h&&this.type==="card"?v(Xt,{clsPrefix:r,class:`${r}-tabs-tab__close`,onClick:this.handleClose,disabled:g}):null))}}),Ia=n("tabs",`
 box-sizing: border-box;
 width: 100%;
 display: flex;
 flex-direction: column;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
`,[c("segment-type",[n("tabs-rail",[T("&.transition-disabled",[n("tabs-capsule",`
 transition: none;
 `)])])]),c("top",[n("tab-pane",`
 padding: var(--n-pane-padding-top) var(--n-pane-padding-right) var(--n-pane-padding-bottom) var(--n-pane-padding-left);
 `)]),c("left",[n("tab-pane",`
 padding: var(--n-pane-padding-right) var(--n-pane-padding-bottom) var(--n-pane-padding-left) var(--n-pane-padding-top);
 `)]),c("left, right",`
 flex-direction: row;
 `,[n("tabs-bar",`
 width: 2px;
 right: 0;
 transition:
 top .2s var(--n-bezier),
 max-height .2s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `),n("tabs-tab",`
 padding: var(--n-tab-padding-vertical); 
 `)]),c("right",`
 flex-direction: row-reverse;
 `,[n("tab-pane",`
 padding: var(--n-pane-padding-left) var(--n-pane-padding-top) var(--n-pane-padding-right) var(--n-pane-padding-bottom);
 `),n("tabs-bar",`
 left: 0;
 `)]),c("bottom",`
 flex-direction: column-reverse;
 justify-content: flex-end;
 `,[n("tab-pane",`
 padding: var(--n-pane-padding-bottom) var(--n-pane-padding-right) var(--n-pane-padding-top) var(--n-pane-padding-left);
 `),n("tabs-bar",`
 top: 0;
 `)]),n("tabs-rail",`
 padding: 3px;
 border-radius: var(--n-tab-border-radius);
 width: 100%;
 background-color: var(--n-color-segment);
 transition: background-color .3s var(--n-bezier);
 display: flex;
 align-items: center;
 `,[n("tabs-capsule",`
 border-radius: var(--n-tab-border-radius);
 position: absolute;
 pointer-events: none;
 background-color: var(--n-tab-color-segment);
 box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .08);
 transition: transform 0.3s var(--n-bezier);
 `),n("tabs-tab-wrapper",`
 flex-basis: 0;
 flex-grow: 1;
 display: flex;
 align-items: center;
 justify-content: center;
 `,[n("tabs-tab",`
 overflow: hidden;
 border-radius: var(--n-tab-border-radius);
 width: 100%;
 display: flex;
 align-items: center;
 justify-content: center;
 `,[c("active",`
 font-weight: var(--n-font-weight-strong);
 color: var(--n-tab-text-color-active);
 `),T("&:hover",`
 color: var(--n-tab-text-color-hover);
 `)])])]),c("flex",[n("tabs-nav",`
 width: 100%;
 position: relative;
 `,[n("tabs-wrapper",`
 width: 100%;
 `,[n("tabs-tab",`
 margin-right: 0;
 `)])])]),n("tabs-nav",`
 box-sizing: border-box;
 line-height: 1.5;
 display: flex;
 transition: border-color .3s var(--n-bezier);
 `,[F("prefix, suffix",`
 display: flex;
 align-items: center;
 `),F("prefix","padding-right: 16px;"),F("suffix","padding-left: 16px;")]),c("top, bottom",[n("tabs-nav-scroll-wrapper",[T("&::before",`
 top: 0;
 bottom: 0;
 left: 0;
 width: 20px;
 `),T("&::after",`
 top: 0;
 bottom: 0;
 right: 0;
 width: 20px;
 `),c("shadow-start",[T("&::before",`
 box-shadow: inset 10px 0 8px -8px rgba(0, 0, 0, .12);
 `)]),c("shadow-end",[T("&::after",`
 box-shadow: inset -10px 0 8px -8px rgba(0, 0, 0, .12);
 `)])])]),c("left, right",[n("tabs-nav-scroll-content",`
 flex-direction: column;
 `),n("tabs-nav-scroll-wrapper",[T("&::before",`
 top: 0;
 left: 0;
 right: 0;
 height: 20px;
 `),T("&::after",`
 bottom: 0;
 left: 0;
 right: 0;
 height: 20px;
 `),c("shadow-start",[T("&::before",`
 box-shadow: inset 0 10px 8px -8px rgba(0, 0, 0, .12);
 `)]),c("shadow-end",[T("&::after",`
 box-shadow: inset 0 -10px 8px -8px rgba(0, 0, 0, .12);
 `)])])]),n("tabs-nav-scroll-wrapper",`
 flex: 1;
 position: relative;
 overflow: hidden;
 `,[n("tabs-nav-y-scroll",`
 height: 100%;
 width: 100%;
 overflow-y: auto; 
 scrollbar-width: none;
 `,[T("&::-webkit-scrollbar",`
 width: 0;
 height: 0;
 `)]),T("&::before, &::after",`
 transition: box-shadow .3s var(--n-bezier);
 pointer-events: none;
 content: "";
 position: absolute;
 z-index: 1;
 `)]),n("tabs-nav-scroll-content",`
 display: flex;
 position: relative;
 min-width: 100%;
 min-height: 100%;
 width: fit-content;
 box-sizing: border-box;
 `),n("tabs-wrapper",`
 display: inline-flex;
 flex-wrap: nowrap;
 position: relative;
 `),n("tabs-tab-wrapper",`
 display: flex;
 flex-wrap: nowrap;
 flex-shrink: 0;
 flex-grow: 0;
 `),n("tabs-tab",`
 cursor: pointer;
 white-space: nowrap;
 flex-wrap: nowrap;
 display: inline-flex;
 align-items: center;
 color: var(--n-tab-text-color);
 font-size: var(--n-tab-font-size);
 background-clip: padding-box;
 padding: var(--n-tab-padding);
 transition:
 box-shadow .3s var(--n-bezier),
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[c("disabled",{cursor:"not-allowed"}),F("close",`
 margin-left: 6px;
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `),F("label",`
 display: flex;
 align-items: center;
 z-index: 1;
 `)]),n("tabs-bar",`
 position: absolute;
 bottom: 0;
 height: 2px;
 border-radius: 1px;
 background-color: var(--n-bar-color);
 transition:
 left .2s var(--n-bezier),
 max-width .2s var(--n-bezier),
 opacity .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `,[T("&.transition-disabled",`
 transition: none;
 `),c("disabled",`
 background-color: var(--n-tab-text-color-disabled)
 `)]),n("tabs-pane-wrapper",`
 position: relative;
 overflow: hidden;
 transition: max-height .2s var(--n-bezier);
 `),n("tab-pane",`
 color: var(--n-pane-text-color);
 width: 100%;
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 opacity .2s var(--n-bezier);
 left: 0;
 right: 0;
 top: 0;
 `,[T("&.next-transition-leave-active, &.prev-transition-leave-active, &.next-transition-enter-active, &.prev-transition-enter-active",`
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 transform .2s var(--n-bezier),
 opacity .2s var(--n-bezier);
 `),T("&.next-transition-leave-active, &.prev-transition-leave-active",`
 position: absolute;
 `),T("&.next-transition-enter-from, &.prev-transition-leave-to",`
 transform: translateX(32px);
 opacity: 0;
 `),T("&.next-transition-leave-to, &.prev-transition-enter-from",`
 transform: translateX(-32px);
 opacity: 0;
 `),T("&.next-transition-leave-from, &.next-transition-enter-to, &.prev-transition-leave-from, &.prev-transition-enter-to",`
 transform: translateX(0);
 opacity: 1;
 `)]),n("tabs-tab-pad",`
 box-sizing: border-box;
 width: var(--n-tab-gap);
 flex-grow: 0;
 flex-shrink: 0;
 `),c("line-type, bar-type",[n("tabs-tab",`
 font-weight: var(--n-tab-font-weight);
 box-sizing: border-box;
 vertical-align: bottom;
 `,[T("&:hover",{color:"var(--n-tab-text-color-hover)"}),c("active",`
 color: var(--n-tab-text-color-active);
 font-weight: var(--n-tab-font-weight-active);
 `),c("disabled",{color:"var(--n-tab-text-color-disabled)"})])]),n("tabs-nav",[c("line-type",[c("top",[F("prefix, suffix",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),n("tabs-nav-scroll-content",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),n("tabs-bar",`
 bottom: -1px;
 `)]),c("left",[F("prefix, suffix",`
 border-right: 1px solid var(--n-tab-border-color);
 `),n("tabs-nav-scroll-content",`
 border-right: 1px solid var(--n-tab-border-color);
 `),n("tabs-bar",`
 right: -1px;
 `)]),c("right",[F("prefix, suffix",`
 border-left: 1px solid var(--n-tab-border-color);
 `),n("tabs-nav-scroll-content",`
 border-left: 1px solid var(--n-tab-border-color);
 `),n("tabs-bar",`
 left: -1px;
 `)]),c("bottom",[F("prefix, suffix",`
 border-top: 1px solid var(--n-tab-border-color);
 `),n("tabs-nav-scroll-content",`
 border-top: 1px solid var(--n-tab-border-color);
 `),n("tabs-bar",`
 top: -1px;
 `)]),F("prefix, suffix",`
 transition: border-color .3s var(--n-bezier);
 `),n("tabs-nav-scroll-content",`
 transition: border-color .3s var(--n-bezier);
 `),n("tabs-bar",`
 border-radius: 0;
 `)]),c("card-type",[F("prefix, suffix",`
 transition: border-color .3s var(--n-bezier);
 border-bottom: 1px solid var(--n-tab-border-color);
 `),n("tabs-pad",`
 flex-grow: 1;
 transition: border-color .3s var(--n-bezier);
 `),n("tabs-tab-pad",`
 transition: border-color .3s var(--n-bezier);
 `),n("tabs-tab",`
 font-weight: var(--n-tab-font-weight);
 border: 1px solid var(--n-tab-border-color);
 background-color: var(--n-tab-color);
 box-sizing: border-box;
 position: relative;
 vertical-align: bottom;
 display: flex;
 justify-content: space-between;
 font-size: var(--n-tab-font-size);
 color: var(--n-tab-text-color);
 `,[c("addable",`
 padding-left: 8px;
 padding-right: 8px;
 font-size: 16px;
 `,[F("height-placeholder",`
 width: 0;
 font-size: var(--n-tab-font-size);
 `),Kt("disabled",[T("&:hover",`
 color: var(--n-tab-text-color-hover);
 `)])]),c("closable","padding-right: 8px;"),c("active",`
 background-color: #0000;
 font-weight: var(--n-tab-font-weight-active);
 color: var(--n-tab-text-color-active);
 `),c("disabled","color: var(--n-tab-text-color-disabled);")]),n("tabs-scroll-padding","border-bottom: 1px solid var(--n-tab-border-color);")]),c("left, right",[n("tabs-wrapper",`
 flex-direction: column;
 `,[n("tabs-tab-wrapper",`
 flex-direction: column;
 `,[n("tabs-tab-pad",`
 height: var(--n-tab-gap-vertical);
 width: 100%;
 `)])])]),c("top",[c("card-type",[n("tabs-tab",`
 border-top-left-radius: var(--n-tab-border-radius);
 border-top-right-radius: var(--n-tab-border-radius);
 `,[c("active",`
 border-bottom: 1px solid #0000;
 `)]),n("tabs-tab-pad",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `),n("tabs-pad",`
 border-bottom: 1px solid var(--n-tab-border-color);
 `)])]),c("left",[c("card-type",[n("tabs-tab",`
 border-top-left-radius: var(--n-tab-border-radius);
 border-bottom-left-radius: var(--n-tab-border-radius);
 `,[c("active",`
 border-right: 1px solid #0000;
 `)]),n("tabs-tab-pad",`
 border-right: 1px solid var(--n-tab-border-color);
 `),n("tabs-pad",`
 border-right: 1px solid var(--n-tab-border-color);
 `)])]),c("right",[c("card-type",[n("tabs-tab",`
 border-top-right-radius: var(--n-tab-border-radius);
 border-bottom-right-radius: var(--n-tab-border-radius);
 `,[c("active",`
 border-left: 1px solid #0000;
 `)]),n("tabs-tab-pad",`
 border-left: 1px solid var(--n-tab-border-color);
 `),n("tabs-pad",`
 border-left: 1px solid var(--n-tab-border-color);
 `)])]),c("bottom",[c("card-type",[n("tabs-tab",`
 border-bottom-left-radius: var(--n-tab-border-radius);
 border-bottom-right-radius: var(--n-tab-border-radius);
 `,[c("active",`
 border-top: 1px solid #0000;
 `)]),n("tabs-tab-pad",`
 border-top: 1px solid var(--n-tab-border-color);
 `),n("tabs-pad",`
 border-top: 1px solid var(--n-tab-border-color);
 `)])])])]),ja=Object.assign(Object.assign({},Xe.props),{value:[String,Number],defaultValue:[String,Number],trigger:{type:String,default:"click"},type:{type:String,default:"bar"},closable:Boolean,justifyContent:String,size:{type:String,default:"medium"},placement:{type:String,default:"top"},tabStyle:[String,Object],tabClass:String,addTabStyle:[String,Object],addTabClass:String,barWidth:Number,paneClass:String,paneStyle:[String,Object],paneWrapperClass:String,paneWrapperStyle:[String,Object],addable:[Boolean,Object],tabsPadding:{type:Number,default:0},animated:Boolean,onBeforeLeave:Function,onAdd:Function,"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array],onClose:[Function,Array],labelSize:String,activeName:[String,Number],onActiveNameChange:[Function,Array]}),Fa=ie({name:"Tabs",props:ja,setup(e,{slots:r}){var o,g,i,_;const{mergedClsPrefixRef:f,inlineThemeDisabled:h}=Yt(e),m=Xe("Tabs","-tabs",Ia,ta,e,f),x=W(null),b=W(null),A=W(null),E=W(null),S=W(null),L=W(null),$=W(!0),B=W(!0),l=Oe(e,["labelSize","size"]),d=Oe(e,["activeName","value"]),k=W((g=(o=d.value)!==null&&o!==void 0?o:e.defaultValue)!==null&&g!==void 0?g:r.default?(_=(i=ue(r.default())[0])===null||i===void 0?void 0:i.props)===null||_===void 0?void 0:_.name:null),y=ga(d,k),w={id:0},p=oe(()=>{if(!(!e.justifyContent||e.type==="card"))return{display:"flex",justifyContent:e.justifyContent}});pe(y,()=>{w.id=0,q(),Re()});function P(){var a;const{value:t}=y;return t===null?null:(a=x.value)===null||a===void 0?void 0:a.querySelector(`[data-name="${t}"]`)}function M(a){if(e.type==="card")return;const{value:t}=b;if(!t)return;const s=t.style.opacity==="0";if(a){const u=`${f.value}-tabs-bar--disabled`,{barWidth:R,placement:D}=e;if(a.dataset.disabled==="true"?t.classList.add(u):t.classList.remove(u),["top","bottom"].includes(D)){if(j(["top","maxHeight","height"]),typeof R=="number"&&a.offsetWidth>=R){const O=Math.floor((a.offsetWidth-R)/2)+a.offsetLeft;t.style.left=`${O}px`,t.style.maxWidth=`${R}px`}else t.style.left=`${a.offsetLeft}px`,t.style.maxWidth=`${a.offsetWidth}px`;t.style.width="8192px",s&&(t.style.transition="none"),t.offsetWidth,s&&(t.style.transition="",t.style.opacity="1")}else{if(j(["left","maxWidth","width"]),typeof R=="number"&&a.offsetHeight>=R){const O=Math.floor((a.offsetHeight-R)/2)+a.offsetTop;t.style.top=`${O}px`,t.style.maxHeight=`${R}px`}else t.style.top=`${a.offsetTop}px`,t.style.maxHeight=`${a.offsetHeight}px`;t.style.height="8192px",s&&(t.style.transition="none"),t.offsetHeight,s&&(t.style.transition="",t.style.opacity="1")}}}function U(){if(e.type==="card")return;const{value:a}=b;a&&(a.style.opacity="0")}function j(a){const{value:t}=b;if(t)for(const s of a)t.style[s]=""}function q(){if(e.type==="card")return;const a=P();a?M(a):U()}function Re(a){var t;const s=(t=S.value)===null||t===void 0?void 0:t.$el;if(!s)return;const u=P();if(!u)return;const{scrollLeft:R,offsetWidth:D}=s,{offsetLeft:O,offsetWidth:ee}=u;R>O?s.scrollTo({top:0,left:O,behavior:"smooth"}):O+ee>R+D&&s.scrollTo({top:0,left:O+ee-D,behavior:"smooth"})}const Q=W(null);let le=0,V=null;function Ke(a){const t=Q.value;if(t){le=a.getBoundingClientRect().height;const s=`${le}px`,u=()=>{t.style.height=s,t.style.maxHeight=s};V?(u(),V(),V=null):V=u}}function Ye(a){const t=Q.value;if(t){const s=a.getBoundingClientRect().height,u=()=>{document.body.offsetHeight,t.style.maxHeight=`${s}px`,t.style.height=`${Math.max(le,s)}px`};V?(V(),V=null,u()):V=u}}function Je(){const a=Q.value;if(a){a.style.maxHeight="",a.style.height="";const{paneWrapperStyle:t}=e;if(typeof t=="string")a.style.cssText=t;else if(t){const{maxHeight:s,height:u}=t;s!==void 0&&(a.style.maxHeight=s),u!==void 0&&(a.style.height=u)}}}const Te={value:[]},ze=W("next");function Qe(a){const t=y.value;let s="next";for(const u of Te.value){if(u===t)break;if(u===a){s="prev";break}}ze.value=s,Ze(a)}function Ze(a){const{onActiveNameChange:t,onUpdateValue:s,"onUpdate:value":u}=e;t&&re(t,a),s&&re(s,a),u&&re(u,a),k.value=a}function et(a){const{onClose:t}=e;t&&re(t,a)}function Pe(){const{value:a}=b;if(!a)return;const t="transition-disabled";a.classList.add(t),q(),a.classList.remove(t)}const X=W(null);function de({transitionDisabled:a}){const t=x.value;if(!t)return;a&&t.classList.add("transition-disabled");const s=P();s&&X.value&&(X.value.style.width=`${s.offsetWidth}px`,X.value.style.height=`${s.offsetHeight}px`,X.value.style.transform=`translateX(${s.offsetLeft-t.offsetLeft-aa(getComputedStyle(t).paddingLeft)}px)`,a&&X.value.offsetWidth),a&&t.classList.remove("transition-disabled")}pe([y],()=>{e.type==="segment"&&ge(()=>{de({transitionDisabled:!1})})}),Jt(()=>{e.type==="segment"&&de({transitionDisabled:!0})});let We=0;function tt(a){var t;if(a.contentRect.width===0&&a.contentRect.height===0||We===a.contentRect.width)return;We=a.contentRect.width;const{type:s}=e;if((s==="line"||s==="bar")&&Pe(),s!=="segment"){const{placement:u}=e;ce((u==="top"||u==="bottom"?(t=S.value)===null||t===void 0?void 0:t.$el:L.value)||null)}}const at=_e(tt,64);pe([()=>e.justifyContent,()=>e.size],()=>{ge(()=>{const{type:a}=e;(a==="line"||a==="bar")&&Pe()})});const Z=W(!1);function rt(a){var t;const{target:s,contentRect:{width:u}}=a,R=s.parentElement.offsetWidth;if(!Z.value)R<u&&(Z.value=!0);else{const{value:D}=E;if(!D)return;R-u>D.$el.offsetWidth&&(Z.value=!1)}ce(((t=S.value)===null||t===void 0?void 0:t.$el)||null)}const nt=_e(rt,64);function ot(){const{onAdd:a}=e;a&&a(),ge(()=>{const t=P(),{value:s}=S;!t||!s||s.scrollTo({left:t.offsetLeft,top:0,behavior:"smooth"})})}function ce(a){if(!a)return;const{placement:t}=e;if(t==="top"||t==="bottom"){const{scrollLeft:s,scrollWidth:u,offsetWidth:R}=a;$.value=s<=0,B.value=s+R>=u}else{const{scrollTop:s,scrollHeight:u,offsetHeight:R}=a;$.value=s<=0,B.value=s+R>=u}}const st=_e(a=>{ce(a.target)},64);Qt($e,{triggerRef:N(e,"trigger"),tabStyleRef:N(e,"tabStyle"),tabClassRef:N(e,"tabClass"),addTabStyleRef:N(e,"addTabStyle"),addTabClassRef:N(e,"addTabClass"),paneClassRef:N(e,"paneClass"),paneStyleRef:N(e,"paneStyle"),mergedClsPrefixRef:f,typeRef:N(e,"type"),closableRef:N(e,"closable"),valueRef:y,tabChangeIdRef:w,onBeforeLeaveRef:N(e,"onBeforeLeave"),activateTab:Qe,handleClose:et,handleAdd:ot}),va(()=>{q(),Re()}),Zt(()=>{const{value:a}=A;if(!a)return;const{value:t}=f,s=`${t}-tabs-nav-scroll-wrapper--shadow-start`,u=`${t}-tabs-nav-scroll-wrapper--shadow-end`;$.value?a.classList.remove(s):a.classList.add(s),B.value?a.classList.remove(u):a.classList.add(u)});const it={syncBarPosition:()=>{q()}},lt=()=>{de({transitionDisabled:!0})},Le=oe(()=>{const{value:a}=l,{type:t}=e,s={card:"Card",bar:"Bar",line:"Line",segment:"Segment"}[t],u=`${a}${s}`,{self:{barColor:R,closeIconColor:D,closeIconColorHover:O,closeIconColorPressed:ee,tabColor:dt,tabBorderColor:ct,paneTextColor:ft,tabFontWeight:bt,tabBorderRadius:ut,tabFontWeightActive:pt,colorSegment:vt,fontWeightStrong:gt,tabColorSegment:ht,closeSize:mt,closeIconSize:xt,closeColorHover:yt,closeColorPressed:wt,closeBorderRadius:_t,[H("panePadding",a)]:te,[H("tabPadding",u)]:St,[H("tabPaddingVertical",u)]:Ct,[H("tabGap",u)]:$t,[H("tabGap",`${u}Vertical`)]:Rt,[H("tabTextColor",t)]:Tt,[H("tabTextColorActive",t)]:zt,[H("tabTextColorHover",t)]:Pt,[H("tabTextColorDisabled",t)]:Wt,[H("tabFontSize",a)]:Lt},common:{cubicBezierEaseInOut:Bt}}=m.value;return{"--n-bezier":Bt,"--n-color-segment":vt,"--n-bar-color":R,"--n-tab-font-size":Lt,"--n-tab-text-color":Tt,"--n-tab-text-color-active":zt,"--n-tab-text-color-disabled":Wt,"--n-tab-text-color-hover":Pt,"--n-pane-text-color":ft,"--n-tab-border-color":ct,"--n-tab-border-radius":ut,"--n-close-size":mt,"--n-close-icon-size":xt,"--n-close-color-hover":yt,"--n-close-color-pressed":wt,"--n-close-border-radius":_t,"--n-close-icon-color":D,"--n-close-icon-color-hover":O,"--n-close-icon-color-pressed":ee,"--n-tab-color":dt,"--n-tab-font-weight":bt,"--n-tab-font-weight-active":pt,"--n-tab-padding":St,"--n-tab-padding-vertical":Ct,"--n-tab-gap":$t,"--n-tab-gap-vertical":Rt,"--n-pane-padding-left":ae(te,"left"),"--n-pane-padding-right":ae(te,"right"),"--n-pane-padding-top":ae(te,"top"),"--n-pane-padding-bottom":ae(te,"bottom"),"--n-font-weight-strong":gt,"--n-tab-color-segment":ht}}),G=h?ea("tabs",oe(()=>`${l.value[0]}${e.type[0]}`),Le,e):void 0;return Object.assign({mergedClsPrefix:f,mergedValue:y,renderedNames:new Set,segmentCapsuleElRef:X,tabsPaneWrapperRef:Q,tabsElRef:x,barElRef:b,addTabInstRef:E,xScrollInstRef:S,scrollWrapperElRef:A,addTabFixed:Z,tabWrapperStyle:p,handleNavResize:at,mergedSize:l,handleScroll:st,handleTabsResize:nt,cssVars:h?void 0:Le,themeClass:G==null?void 0:G.themeClass,animationDirection:ze,renderNameListRef:Te,yScrollElRef:L,handleSegmentResize:lt,onAnimationBeforeLeave:Ke,onAnimationEnter:Ye,onAnimationAfterEnter:Je,onRender:G==null?void 0:G.onRender},it)},render(){const{mergedClsPrefix:e,type:r,placement:o,addTabFixed:g,addable:i,mergedSize:_,renderNameListRef:f,onRender:h,paneWrapperClass:m,paneWrapperStyle:x,$slots:{default:b,prefix:A,suffix:E}}=this;h==null||h();const S=b?ue(b()).filter(w=>w.type.__TAB_PANE__===!0):[],L=b?ue(b()).filter(w=>w.type.__TAB__===!0):[],$=!L.length,B=r==="card",l=r==="segment",d=!B&&!l&&this.justifyContent;f.value=[];const k=()=>{const w=v("div",{style:this.tabWrapperStyle,class:[`${e}-tabs-wrapper`]},d?null:v("div",{class:`${e}-tabs-scroll-padding`,style:{width:`${this.tabsPadding}px`}}),$?S.map((p,P)=>(f.value.push(p.props.name),Se(v(Ce,Object.assign({},p.props,{internalCreatedByPane:!0,internalLeftPadded:P!==0&&(!d||d==="center"||d==="start"||d==="end")}),p.children?{default:p.children.tab}:void 0)))):L.map((p,P)=>(f.value.push(p.props.name),Se(P!==0&&!d?Ve(p):p))),!g&&i&&B?Ue(i,($?S.length:L.length)!==0):null,d?null:v("div",{class:`${e}-tabs-scroll-padding`,style:{width:`${this.tabsPadding}px`}}));return v("div",{ref:"tabsElRef",class:`${e}-tabs-nav-scroll-content`},B&&i?v(ve,{onResize:this.handleTabsResize},{default:()=>w}):w,B?v("div",{class:`${e}-tabs-pad`}):null,B?null:v("div",{ref:"barElRef",class:`${e}-tabs-bar`}))},y=l?"top":o;return v("div",{class:[`${e}-tabs`,this.themeClass,`${e}-tabs--${r}-type`,`${e}-tabs--${_}-size`,d&&`${e}-tabs--flex`,`${e}-tabs--${y}`],style:this.cssVars},v("div",{class:[`${e}-tabs-nav--${r}-type`,`${e}-tabs-nav--${y}`,`${e}-tabs-nav`]},Ee(A,w=>w&&v("div",{class:`${e}-tabs-nav__prefix`},w)),l?v(ve,{onResize:this.handleSegmentResize},{default:()=>v("div",{class:`${e}-tabs-rail`,ref:"tabsElRef"},v("div",{class:`${e}-tabs-capsule`,ref:"segmentCapsuleElRef"},v("div",{class:`${e}-tabs-wrapper`},v("div",{class:`${e}-tabs-tab`}))),$?S.map((w,p)=>(f.value.push(w.props.name),v(Ce,Object.assign({},w.props,{internalCreatedByPane:!0,internalLeftPadded:p!==0}),w.children?{default:w.children.tab}:void 0))):L.map((w,p)=>(f.value.push(w.props.name),p===0?w:Ve(w))))}):v(ve,{onResize:this.handleNavResize},{default:()=>v("div",{class:`${e}-tabs-nav-scroll-wrapper`,ref:"scrollWrapperElRef"},["top","bottom"].includes(y)?v(ya,{ref:"xScrollInstRef",onScroll:this.handleScroll},{default:k}):v("div",{class:`${e}-tabs-nav-y-scroll`,onScroll:this.handleScroll,ref:"yScrollElRef"},k()))}),g&&i&&B?Ue(i,!0):null,Ee(E,w=>w&&v("div",{class:`${e}-tabs-nav__suffix`},w))),$&&(this.animated&&(y==="top"||y==="bottom")?v("div",{ref:"tabsPaneWrapperRef",style:x,class:[`${e}-tabs-pane-wrapper`,m]},De(S,this.mergedValue,this.renderedNames,this.onAnimationBeforeLeave,this.onAnimationEnter,this.onAnimationAfterEnter,this.animationDirection)):De(S,this.mergedValue,this.renderedNames)))}});function De(e,r,o,g,i,_,f){const h=[];return e.forEach(m=>{const{name:x,displayDirective:b,"display-directive":A}=m.props,E=L=>b===L||A===L,S=r===x;if(m.key!==void 0&&(m.key=x),S||E("show")||E("show:lazy")&&o.has(x)){o.has(x)||o.add(x);const L=!E("if");h.push(L?ra(m,[[na,S]]):m)}}),f?v(oa,{name:`${f}-transition`,onBeforeLeave:g,onEnter:i,onAfterEnter:_},{default:()=>h}):h}function Ue(e,r){return v(Ce,{ref:"addTabInstRef",key:"__addable",name:"__addable",internalCreatedByPane:!0,internalAddable:!0,internalLeftPadded:r,disabled:typeof e=="object"&&e.disabled})}function Ve(e){const r=sa(e);return r.props?r.props.internalLeftPadded=!0:r.props={internalLeftPadded:!0},r}function Se(e){return Array.isArray(e.dynamicProps)?e.dynamicProps.includes("internalLeftPadded")||e.dynamicProps.push("internalLeftPadded"):e.dynamicProps=["internalLeftPadded"],e}const Oa={class:"m-30 flex items-center"},Na={__name:"index",setup(e){const r=ia(),{t:o}=la(),g=da(),i=W(!1),_=W(null),f=W({avatar:g.avatar,username:g.name,email:g.email});function h(){return K(this,null,function*(){var l;i.value=!0,(l=_.value)==null||l.validate(d=>K(this,null,function*(){d||(yield ne.updateUser(be(fe({},f.value),{id:g.userId})).then(()=>{g.setUserInfo(f.value),i.value=!1,$message.success(o("common.text.save_success"))}).catch(()=>{i.value=!1}))}))})}const m={username:[{required:!0,message:o("views.profile.message_username_required"),trigger:["input","blur","change"]}]},x=W(null),b=W({old_password:"",new_password:"",confirm_password:""});function A(){return K(this,null,function*(){var l;i.value=!0,(l=x.value)==null||l.validate(d=>K(this,null,function*(){if(!d){const k=be(fe({},b.value),{id:g.userId});yield ne.updatePassword(k).then(y=>{$message.success(y.msg),b.value={old_password:"",new_password:"",confirm_password:""},i.value=!1}).catch(()=>{i.value=!1})}}))})}const E={old_password:[{required:!0,message:o("views.profile.message_old_password_required"),trigger:["input","blur","change"]}],new_password:[{required:!0,message:o("views.profile.message_new_password_required"),trigger:["input","blur","change"]}],confirm_password:[{required:!0,message:o("views.profile.message_password_confirmation_required"),trigger:["input","blur"]},{validator:S,message:o("views.profile.message_password_confirmation_diff"),trigger:"input"},{validator:L,message:o("views.profile.message_password_confirmation_diff"),trigger:["blur","password-input"]}]};function S(l,d){return!!b.value.new_password&&b.value.new_password.startsWith(d)&&b.value.new_password.length>=d.length}function L(l,d){return d===b.value.new_password}function $(l){return K(this,null,function*(){var k;var d=["image/avif","image/vnd.microsoft.icon","image/jpeg","image/tiff","image/bmp","image/svg+xml","image/webp","image/png"];return d.indexOf((k=l.file.file)==null?void 0:k.type)==-1?($message.error("只能上传图片文件，请重新上传"),!1):!0})}const B=({file:l,data:d,headers:k,withCredentials:y,action:w,onFinish:p,onError:P,onProgress:M})=>{const U=new FormData;d&&Object.keys(d).forEach(j=>{U.append(j,d[j])}),U.append("file",l.file),ne.uploadImage(U,k,j=>{var q=Math.round(j.loaded*100/j.total);M({percent:Math.ceil(q)}),$message.loading(o("views.content.label_uploading")+` ${Math.ceil(q)}%`)}).then(j=>{$message.success(j.msg),f.value.avatar=j.data,p()}).catch(j=>{P()})};return(l,d)=>{const k=ha;return he(),me(fa,{"show-header":!1},{default:I(()=>[z(C(Fa),{type:"line",animated:""},{default:I(()=>[z(C(Me),{name:"website",tab:l.$t("views.profile.label_modify_information")},{default:I(()=>[ca("div",Oa,[z(C(je),{ref_key:"infoFormRef",ref:_,"label-placement":"top","label-align":"left","label-width":"100",model:f.value,rules:m,class:"w-500"},{default:I(()=>[z(C(Y),{label:l.$t("views.profile.label_avatar"),path:"avatar"},{default:I(()=>[z(C(J),{value:f.value.avatar,"onUpdate:value":d[0]||(d[0]=y=>f.value.avatar=y),type:"text",placeholder:l.$t("views.profile.placeholder_avatar")},null,8,["value","placeholder"])]),_:1},8,["label"]),C(r).storageSetting.enable_storage?(he(),me(k,{key:0,action:C(ne).uploadApi,"custom-request":B,class:"upload-button",onBeforeUpload:$,accept:".tif,.jpg,.jpeg,.ico,.tiff,.gif,.svg,.jfif,.webp,.png,.bmp,.jpeg,.avif","show-file-list":!1},{default:I(()=>[z(C(xe),null,{default:I(()=>[ye("上传图片")]),_:1})]),_:1},8,["action"])):ke("",!0),f.value.avatar!=null&&f.value.avatar!=""?(he(),me(C(ma),{key:1,width:"100",src:f.value.avatar,id:"preview-avatar"},null,8,["src"])):ke("",!0),z(C(Y),{label:l.$t("views.profile.label_username"),path:"username"},{default:I(()=>[z(C(J),{value:f.value.username,"onUpdate:value":d[1]||(d[1]=y=>f.value.username=y),type:"text",placeholder:l.$t("views.profile.placeholder_username")},null,8,["value","placeholder"])]),_:1},8,["label"]),z(C(Y),{label:l.$t("views.profile.label_email"),path:"email"},{default:I(()=>[z(C(J),{value:f.value.email,"onUpdate:value":d[2]||(d[2]=y=>f.value.email=y),type:"text",placeholder:l.$t("views.profile.placeholder_email")},null,8,["value","placeholder"])]),_:1},8,["label"]),z(C(xe),{type:"primary",loading:i.value,onClick:h},{default:I(()=>[ye(Ie(l.$t("common.buttons.save")),1)]),_:1},8,["loading"])]),_:1},8,["model"])])]),_:1},8,["tab"]),z(C(Me),{name:"contact",tab:l.$t("views.profile.label_change_password")},{default:I(()=>[z(C(je),{ref_key:"passwordFormRef",ref:x,"label-placement":"top","label-align":"left",model:b.value,"label-width":"200",rules:E,class:"m-30 w-500"},{default:I(()=>[z(C(Y),{label:l.$t("views.profile.label_old_password"),path:"old_password"},{default:I(()=>[z(C(J),{value:b.value.old_password,"onUpdate:value":d[3]||(d[3]=y=>b.value.old_password=y),type:"password","show-password-on":"mousedown",placeholder:l.$t("views.profile.placeholder_old_password")},null,8,["value","placeholder"])]),_:1},8,["label"]),z(C(Y),{label:l.$t("views.profile.label_new_password"),path:"new_password"},{default:I(()=>[z(C(J),{value:b.value.new_password,"onUpdate:value":d[4]||(d[4]=y=>b.value.new_password=y),disabled:!b.value.old_password,type:"password","show-password-on":"mousedown",placeholder:l.$t("views.profile.placeholder_new_password")},null,8,["value","disabled","placeholder"])]),_:1},8,["label"]),z(C(Y),{label:l.$t("views.profile.label_confirm_password"),path:"confirm_password"},{default:I(()=>[z(C(J),{value:b.value.confirm_password,"onUpdate:value":d[5]||(d[5]=y=>b.value.confirm_password=y),disabled:!b.value.new_password,type:"password","show-password-on":"mousedown",placeholder:l.$t("views.profile.placeholder_confirm_password")},null,8,["value","disabled","placeholder"])]),_:1},8,["label"]),z(C(xe),{type:"primary",loading:i.value,onClick:A},{default:I(()=>[ye(Ie(l.$t("common.buttons.save")),1)]),_:1},8,["loading"])]),_:1},8,["model"])]),_:1},8,["tab"])]),_:1})]),_:1})}}},er=ba(Na,[["__scopeId","data-v-c96e0c0b"]]);export{er as default};
