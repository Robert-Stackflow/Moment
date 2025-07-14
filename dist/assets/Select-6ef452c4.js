import{d as ue,aI as en,o as Ke,c1 as tn,c4 as nn,i as M,r as z,C as He,aT as it,dx as De,h as r,aH as on,V as dt,ec as ut,ah as xt,c as _,e as E,a as re,u as Ue,f as pe,dD as ln,n as at,ed as rn,aQ as he,j as qe,z as Ct,B as Re,aw as St,b as ne,H as lt,c$ as Rt,aD as Tt,t as ee,ee as an,aa as Te,ab as Ft,aR as _e,p as ct,aE as ft,dy as sn,N as dn,q as un,dE as cn,K as fn,F as hn,ef as vn,eg as gn,d0 as pn,d2 as bn,a7 as mn,a8 as wn,d4 as ht,d5 as yn,d8 as xn,A as de}from"./index-e858760b.js";import{a as Ot,u as vt}from"./use-locale-aaabd27b.js";import{a as Cn,h as je,_ as Je,V as gt,c as Sn}from"./Tag-c34105c9.js";import{c as Rn,a as et,f as Tn,i as st,g as Fn,N as On,u as zn,b as rt,V as Mn,d as Pn,e as kn}from"./Popover-8aa39b13.js";import{a as In}from"./Input-dbf813c2.js";function pt(e){switch(typeof e){case"string":return e||void 0;case"number":return String(e);default:return}}function tt(e){const n=e.filter(o=>o!==void 0);if(n.length!==0)return n.length===1?n[0]:o=>{e.forEach(d=>{d&&d(o)})}}function bt(e){return e&-e}class _n{constructor(n,o){this.l=n,this.min=o;const d=new Array(n+1);for(let a=0;a<n+1;++a)d[a]=0;this.ft=d}add(n,o){if(o===0)return;const{l:d,ft:a}=this;for(n+=1;n<=d;)a[n]+=o,n+=bt(n)}get(n){return this.sum(n+1)-this.sum(n)}sum(n){if(n===void 0&&(n=this.l),n<=0)return 0;const{ft:o,min:d,l:a}=this;if(n>a)throw new Error("[FinweckTree.sum]: `i` is larger than length.");let u=n*d;for(;n>0;)u+=o[n],n-=bt(n);return u}getBound(n){let o=0,d=this.l;for(;d>o;){const a=Math.floor((o+d)/2),u=this.sum(a);if(u>n){d=a;continue}else if(u<n){if(o===a)return this.sum(o+1)<=n?o+1:a;o=a}else return a}return o}}let Ve;function Bn(){return typeof document=="undefined"?!1:(Ve===void 0&&("matchMedia"in window?Ve=window.matchMedia("(pointer:coarse)").matches:Ve=!1),Ve)}let nt;function mt(){return typeof document=="undefined"?1:(nt===void 0&&(nt="chrome"in window?window.devicePixelRatio:1),nt)}const $n=et(".v-vl",{maxHeight:"inherit",height:"100%",overflow:"auto",minWidth:"1px"},[et("&:not(.v-vl--show-scrollbar)",{scrollbarWidth:"none"},[et("&::-webkit-scrollbar, &::-webkit-scrollbar-track-piece, &::-webkit-scrollbar-thumb",{width:0,height:0,display:"none"})])]),En=ue({name:"VirtualList",inheritAttrs:!1,props:{showScrollbar:{type:Boolean,default:!0},items:{type:Array,default:()=>[]},itemSize:{type:Number,required:!0},itemResizable:Boolean,itemsStyle:[String,Object],visibleItemsTag:{type:[String,Object],default:"div"},visibleItemsProps:Object,ignoreItemResize:Boolean,onScroll:Function,onWheel:Function,onResize:Function,defaultScrollKey:[Number,String],defaultScrollIndex:Number,keyField:{type:String,default:"key"},paddingTop:{type:[Number,String],default:0},paddingBottom:{type:[Number,String],default:0}},setup(e){const n=en();$n.mount({id:"vueuc/virtual-list",head:!0,anchorMetaName:Rn,ssr:n}),Ke(()=>{const{defaultScrollIndex:h,defaultScrollKey:p}=e;h!=null?m({index:h}):p!=null&&m({key:p})});let o=!1,d=!1;tn(()=>{if(o=!1,!d){d=!0;return}m({top:P.value,left:b})}),nn(()=>{o=!0,d||(d=!0)});const a=M(()=>{const h=new Map,{keyField:p}=e;return e.items.forEach((w,N)=>{h.set(w[p],N)}),h}),u=z(null),v=z(void 0),s=new Map,R=M(()=>{const{items:h,itemSize:p,keyField:w}=e,N=new _n(h.length,p);return h.forEach((A,L)=>{const D=A[w],V=s.get(D);V!==void 0&&N.add(L,V)}),N}),C=z(0);let b=0;const P=z(0),$=He(()=>Math.max(R.value.getBound(P.value-it(e.paddingTop))-1,0)),B=M(()=>{const{value:h}=v;if(h===void 0)return[];const{items:p,itemSize:w}=e,N=$.value,A=Math.min(N+Math.ceil(h/w+1),p.length-1),L=[];for(let D=N;D<=A;++D)L.push(p[D]);return L}),m=(h,p)=>{if(typeof h=="number"){k(h,p,"auto");return}const{left:w,top:N,index:A,key:L,position:D,behavior:V,debounce:Q=!0}=h;if(w!==void 0||N!==void 0)k(w,N,V);else if(A!==void 0)T(A,V,Q);else if(L!==void 0){const Y=a.value.get(L);Y!==void 0&&T(Y,V,Q)}else D==="bottom"?k(0,Number.MAX_SAFE_INTEGER,V):D==="top"&&k(0,0,V)};let x,H=null;function T(h,p,w){const{value:N}=R,A=N.sum(h)+it(e.paddingTop);if(!w)u.value.scrollTo({left:0,top:A,behavior:p});else{x=h,H!==null&&window.clearTimeout(H),H=window.setTimeout(()=>{x=void 0,H=null},16);const{scrollTop:L,offsetHeight:D}=u.value;if(A>L){const V=N.get(h);A+V<=L+D||u.value.scrollTo({left:0,top:A+V-D,behavior:p})}else u.value.scrollTo({left:0,top:A,behavior:p})}}function k(h,p,w){u.value.scrollTo({left:h,top:p,behavior:w})}function j(h,p){var w,N,A;if(o||e.ignoreItemResize||ae(p.target))return;const{value:L}=R,D=a.value.get(h),V=L.get(D),Q=(A=(N=(w=p.borderBoxSize)===null||w===void 0?void 0:w[0])===null||N===void 0?void 0:N.blockSize)!==null&&A!==void 0?A:p.contentRect.height;if(Q===V)return;Q-e.itemSize===0?s.delete(h):s.set(h,Q-e.itemSize);const le=Q-V;if(le===0)return;L.add(D,le);const i=u.value;if(i!=null){if(x===void 0){const f=L.sum(D);i.scrollTop>f&&i.scrollBy(0,le)}else if(D<x)i.scrollBy(0,le);else if(D===x){const f=L.sum(D);Q+f>i.scrollTop+i.offsetHeight&&i.scrollBy(0,le)}ie()}C.value++}const X=!Bn();let G=!1;function K(h){var p;(p=e.onScroll)===null||p===void 0||p.call(e,h),(!X||!G)&&ie()}function Z(h){var p;if((p=e.onWheel)===null||p===void 0||p.call(e,h),X){const w=u.value;if(w!=null){if(h.deltaX===0&&(w.scrollTop===0&&h.deltaY<=0||w.scrollTop+w.offsetHeight>=w.scrollHeight&&h.deltaY>=0))return;h.preventDefault(),w.scrollTop+=h.deltaY/mt(),w.scrollLeft+=h.deltaX/mt(),ie(),G=!0,Tn(()=>{G=!1})}}}function oe(h){if(o||ae(h.target)||h.contentRect.height===v.value)return;v.value=h.contentRect.height;const{onResize:p}=e;p!==void 0&&p(h)}function ie(){const{value:h}=u;h!=null&&(P.value=h.scrollTop,b=h.scrollLeft)}function ae(h){let p=h;for(;p!==null;){if(p.style.display==="none")return!0;p=p.parentElement}return!1}return{listHeight:v,listStyle:{overflow:"auto"},keyToIndex:a,itemsStyle:M(()=>{const{itemResizable:h}=e,p=De(R.value.sum());return C.value,[e.itemsStyle,{boxSizing:"content-box",height:h?"":p,minHeight:h?p:"",paddingTop:De(e.paddingTop),paddingBottom:De(e.paddingBottom)}]}),visibleItemsStyle:M(()=>(C.value,{transform:`translateY(${De(R.value.sum($.value))})`})),viewportItems:B,listElRef:u,itemsElRef:z(null),scrollTo:m,handleListResize:oe,handleListScroll:K,handleListWheel:Z,handleItemResize:j}},render(){const{itemResizable:e,keyField:n,keyToIndex:o,visibleItemsTag:d}=this;return r(dt,{onResize:this.handleListResize},{default:()=>{var a,u;return r("div",on(this.$attrs,{class:["v-vl",this.showScrollbar&&"v-vl--show-scrollbar"],onScroll:this.handleListScroll,onWheel:this.handleListWheel,ref:"listElRef"}),[this.items.length!==0?r("div",{ref:"itemsElRef",class:"v-vl-items",style:this.itemsStyle},[r(d,Object.assign({class:"v-vl-visible-items",style:this.visibleItemsStyle},this.visibleItemsProps),{default:()=>this.viewportItems.map(v=>{const s=v[n],R=o.get(s),C=this.$slots.default({item:v,index:R})[0];return e?r(dt,{key:s,onResize:b=>this.handleItemResize(s,b)},{default:()=>C}):(C.key=s,C)})})]):(u=(a=this.$slots).empty)===null||u===void 0?void 0:u.call(a)])}})}});function zt(e,n){n&&(Ke(()=>{const{value:o}=e;o&&ut.registerHandler(o,n)}),xt(()=>{const{value:o}=e;o&&ut.unregisterHandler(o)}))}const Nn=ue({name:"Checkmark",render(){return r("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 16 16"},r("g",{fill:"none"},r("path",{d:"M14.046 3.486a.75.75 0 0 1-.032 1.06l-7.93 7.474a.85.85 0 0 1-1.188-.022l-2.68-2.72a.75.75 0 1 1 1.068-1.053l2.234 2.267l7.468-7.038a.75.75 0 0 1 1.06.032z",fill:"currentColor"})))}}),An=ue({name:"Empty",render(){return r("svg",{viewBox:"0 0 28 28",fill:"none",xmlns:"http://www.w3.org/2000/svg"},r("path",{d:"M26 7.5C26 11.0899 23.0899 14 19.5 14C15.9101 14 13 11.0899 13 7.5C13 3.91015 15.9101 1 19.5 1C23.0899 1 26 3.91015 26 7.5ZM16.8536 4.14645C16.6583 3.95118 16.3417 3.95118 16.1464 4.14645C15.9512 4.34171 15.9512 4.65829 16.1464 4.85355L18.7929 7.5L16.1464 10.1464C15.9512 10.3417 15.9512 10.6583 16.1464 10.8536C16.3417 11.0488 16.6583 11.0488 16.8536 10.8536L19.5 8.20711L22.1464 10.8536C22.3417 11.0488 22.6583 11.0488 22.8536 10.8536C23.0488 10.6583 23.0488 10.3417 22.8536 10.1464L20.2071 7.5L22.8536 4.85355C23.0488 4.65829 23.0488 4.34171 22.8536 4.14645C22.6583 3.95118 22.3417 3.95118 22.1464 4.14645L19.5 6.79289L16.8536 4.14645Z",fill:"currentColor"}),r("path",{d:"M25 22.75V12.5991C24.5572 13.0765 24.053 13.4961 23.5 13.8454V16H17.5L17.3982 16.0068C17.0322 16.0565 16.75 16.3703 16.75 16.75C16.75 18.2688 15.5188 19.5 14 19.5C12.4812 19.5 11.25 18.2688 11.25 16.75L11.2432 16.6482C11.1935 16.2822 10.8797 16 10.5 16H4.5V7.25C4.5 6.2835 5.2835 5.5 6.25 5.5H12.2696C12.4146 4.97463 12.6153 4.47237 12.865 4H6.25C4.45507 4 3 5.45507 3 7.25V22.75C3 24.5449 4.45507 26 6.25 26H21.75C23.5449 26 25 24.5449 25 22.75ZM4.5 22.75V17.5H9.81597L9.85751 17.7041C10.2905 19.5919 11.9808 21 14 21L14.215 20.9947C16.2095 20.8953 17.842 19.4209 18.184 17.5H23.5V22.75C23.5 23.7165 22.7165 24.5 21.75 24.5H6.25C5.2835 24.5 4.5 23.7165 4.5 22.75Z",fill:"currentColor"}))}}),Ln=ue({props:{onFocus:Function,onBlur:Function},setup(e){return()=>r("div",{style:"width: 0; height: 0",tabindex:0,onFocus:e.onFocus,onBlur:e.onBlur})}}),Dn=_("empty",`
 display: flex;
 flex-direction: column;
 align-items: center;
 font-size: var(--n-font-size);
`,[E("icon",`
 width: var(--n-icon-size);
 height: var(--n-icon-size);
 font-size: var(--n-icon-size);
 line-height: var(--n-icon-size);
 color: var(--n-icon-color);
 transition:
 color .3s var(--n-bezier);
 `,[re("+",[E("description",`
 margin-top: 8px;
 `)])]),E("description",`
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `),E("extra",`
 text-align: center;
 transition: color .3s var(--n-bezier);
 margin-top: 12px;
 color: var(--n-extra-text-color);
 `)]),Vn=Object.assign(Object.assign({},pe.props),{description:String,showDescription:{type:Boolean,default:!0},showIcon:{type:Boolean,default:!0},size:{type:String,default:"medium"},renderIcon:Function}),Hn=ue({name:"Empty",props:Vn,setup(e){const{mergedClsPrefixRef:n,inlineThemeDisabled:o}=Ue(e),d=pe("Empty","-empty",Dn,ln,e,n),{localeRef:a}=Ot("Empty"),u=at(rn,null),v=M(()=>{var b,P,$;return(b=e.description)!==null&&b!==void 0?b:($=(P=u==null?void 0:u.mergedComponentPropsRef.value)===null||P===void 0?void 0:P.Empty)===null||$===void 0?void 0:$.description}),s=M(()=>{var b,P;return((P=(b=u==null?void 0:u.mergedComponentPropsRef.value)===null||b===void 0?void 0:b.Empty)===null||P===void 0?void 0:P.renderIcon)||(()=>r(An,null))}),R=M(()=>{const{size:b}=e,{common:{cubicBezierEaseInOut:P},self:{[he("iconSize",b)]:$,[he("fontSize",b)]:B,textColor:m,iconColor:x,extraTextColor:H}}=d.value;return{"--n-icon-size":$,"--n-font-size":B,"--n-bezier":P,"--n-text-color":m,"--n-icon-color":x,"--n-extra-text-color":H}}),C=o?qe("empty",M(()=>{let b="";const{size:P}=e;return b+=P[0],b}),R,e):void 0;return{mergedClsPrefix:n,mergedRenderIcon:s,localizedDescription:M(()=>v.value||a.value.description),cssVars:o?void 0:R,themeClass:C==null?void 0:C.themeClass,onRender:C==null?void 0:C.onRender}},render(){const{$slots:e,mergedClsPrefix:n,onRender:o}=this;return o==null||o(),r("div",{class:[`${n}-empty`,this.themeClass],style:this.cssVars},this.showIcon?r("div",{class:`${n}-empty__icon`},e.icon?e.icon():r(Ct,{clsPrefix:n},{default:this.mergedRenderIcon})):null,this.showDescription?r("div",{class:`${n}-empty__description`},e.default?e.default():this.localizedDescription):null,e.extra?r("div",{class:`${n}-empty__extra`},e.extra()):null)}});function jn(e,n){return r(St,{name:"fade-in-scale-up-transition"},{default:()=>e?r(Ct,{clsPrefix:n,class:`${n}-base-select-option__check`},{default:()=>r(Nn)}):null})}const wt=ue({name:"NBaseSelectOption",props:{clsPrefix:{type:String,required:!0},tmNode:{type:Object,required:!0}},setup(e){const{valueRef:n,pendingTmNodeRef:o,multipleRef:d,valueSetRef:a,renderLabelRef:u,renderOptionRef:v,labelFieldRef:s,valueFieldRef:R,showCheckmarkRef:C,nodePropsRef:b,handleOptionClick:P,handleOptionMouseEnter:$}=at(st),B=He(()=>{const{value:T}=o;return T?e.tmNode.key===T.key:!1});function m(T){const{tmNode:k}=e;k.disabled||P(T,k)}function x(T){const{tmNode:k}=e;k.disabled||$(T,k)}function H(T){const{tmNode:k}=e,{value:j}=B;k.disabled||j||$(T,k)}return{multiple:d,isGrouped:He(()=>{const{tmNode:T}=e,{parent:k}=T;return k&&k.rawNode.type==="group"}),showCheckmark:C,nodeProps:b,isPending:B,isSelected:He(()=>{const{value:T}=n,{value:k}=d;if(T===null)return!1;const j=e.tmNode.rawNode[R.value];if(k){const{value:X}=a;return X.has(j)}else return T===j}),labelField:s,renderLabel:u,renderOption:v,handleMouseMove:H,handleMouseEnter:x,handleClick:m}},render(){const{clsPrefix:e,tmNode:{rawNode:n},isSelected:o,isPending:d,isGrouped:a,showCheckmark:u,nodeProps:v,renderOption:s,renderLabel:R,handleClick:C,handleMouseEnter:b,handleMouseMove:P}=this,$=jn(o,e),B=R?[R(n,o),u&&$]:[Re(n[this.labelField],n,o),u&&$],m=v==null?void 0:v(n),x=r("div",Object.assign({},m,{class:[`${e}-base-select-option`,n.class,m==null?void 0:m.class,{[`${e}-base-select-option--disabled`]:n.disabled,[`${e}-base-select-option--selected`]:o,[`${e}-base-select-option--grouped`]:a,[`${e}-base-select-option--pending`]:d,[`${e}-base-select-option--show-checkmark`]:u}],style:[(m==null?void 0:m.style)||"",n.style||""],onClick:tt([C,m==null?void 0:m.onClick]),onMouseenter:tt([b,m==null?void 0:m.onMouseenter]),onMousemove:tt([P,m==null?void 0:m.onMousemove])}),r("div",{class:`${e}-base-select-option__content`},B));return n.render?n.render({node:x,option:n,selected:o}):s?s({node:x,option:n,selected:o}):x}}),yt=ue({name:"NBaseSelectGroupHeader",props:{clsPrefix:{type:String,required:!0},tmNode:{type:Object,required:!0}},setup(){const{renderLabelRef:e,renderOptionRef:n,labelFieldRef:o,nodePropsRef:d}=at(st);return{labelField:o,nodeProps:d,renderLabel:e,renderOption:n}},render(){const{clsPrefix:e,renderLabel:n,renderOption:o,nodeProps:d,tmNode:{rawNode:a}}=this,u=d==null?void 0:d(a),v=n?n(a,!1):Re(a[this.labelField],a,!1),s=r("div",Object.assign({},u,{class:[`${e}-base-select-group-header`,u==null?void 0:u.class]}),v);return a.render?a.render({node:s,option:a}):o?o({node:s,option:a,selected:!1}):s}}),Wn=_("base-select-menu",`
 line-height: 1.5;
 outline: none;
 z-index: 0;
 position: relative;
 border-radius: var(--n-border-radius);
 transition:
 background-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier);
 background-color: var(--n-color);
`,[_("scrollbar",`
 max-height: var(--n-height);
 `),_("virtual-list",`
 max-height: var(--n-height);
 `),_("base-select-option",`
 min-height: var(--n-option-height);
 font-size: var(--n-option-font-size);
 display: flex;
 align-items: center;
 `,[E("content",`
 z-index: 1;
 white-space: nowrap;
 text-overflow: ellipsis;
 overflow: hidden;
 `)]),_("base-select-group-header",`
 min-height: var(--n-option-height);
 font-size: .93em;
 display: flex;
 align-items: center;
 `),_("base-select-menu-option-wrapper",`
 position: relative;
 width: 100%;
 `),E("loading, empty",`
 display: flex;
 padding: 12px 32px;
 flex: 1;
 justify-content: center;
 `),E("loading",`
 color: var(--n-loading-color);
 font-size: var(--n-loading-size);
 `),E("header",`
 padding: 8px var(--n-option-padding-left);
 font-size: var(--n-option-font-size);
 transition: 
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 border-bottom: 1px solid var(--n-action-divider-color);
 color: var(--n-action-text-color);
 `),E("action",`
 padding: 8px var(--n-option-padding-left);
 font-size: var(--n-option-font-size);
 transition: 
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 border-top: 1px solid var(--n-action-divider-color);
 color: var(--n-action-text-color);
 `),_("base-select-group-header",`
 position: relative;
 cursor: default;
 padding: var(--n-option-padding);
 color: var(--n-group-header-text-color);
 `),_("base-select-option",`
 cursor: pointer;
 position: relative;
 padding: var(--n-option-padding);
 transition:
 color .3s var(--n-bezier),
 opacity .3s var(--n-bezier);
 box-sizing: border-box;
 color: var(--n-option-text-color);
 opacity: 1;
 `,[ne("show-checkmark",`
 padding-right: calc(var(--n-option-padding-right) + 20px);
 `),re("&::before",`
 content: "";
 position: absolute;
 left: 4px;
 right: 4px;
 top: 0;
 bottom: 0;
 border-radius: var(--n-border-radius);
 transition: background-color .3s var(--n-bezier);
 `),re("&:active",`
 color: var(--n-option-text-color-pressed);
 `),ne("grouped",`
 padding-left: calc(var(--n-option-padding-left) * 1.5);
 `),ne("pending",[re("&::before",`
 background-color: var(--n-option-color-pending);
 `)]),ne("selected",`
 color: var(--n-option-text-color-active);
 `,[re("&::before",`
 background-color: var(--n-option-color-active);
 `),ne("pending",[re("&::before",`
 background-color: var(--n-option-color-active-pending);
 `)])]),ne("disabled",`
 cursor: not-allowed;
 `,[lt("selected",`
 color: var(--n-option-text-color-disabled);
 `),ne("selected",`
 opacity: var(--n-option-opacity-disabled);
 `)]),E("check",`
 font-size: 16px;
 position: absolute;
 right: calc(var(--n-option-padding-right) - 4px);
 top: calc(50% - 7px);
 color: var(--n-option-check-color);
 transition: color .3s var(--n-bezier);
 `,[Rt({enterScale:"0.5"})])])]),Kn=ue({name:"InternalSelectMenu",props:Object.assign(Object.assign({},pe.props),{clsPrefix:{type:String,required:!0},scrollable:{type:Boolean,default:!0},treeMate:{type:Object,required:!0},multiple:Boolean,size:{type:String,default:"medium"},value:{type:[String,Number,Array],default:null},autoPending:Boolean,virtualScroll:{type:Boolean,default:!0},show:{type:Boolean,default:!0},labelField:{type:String,default:"label"},valueField:{type:String,default:"value"},loading:Boolean,focusable:Boolean,renderLabel:Function,renderOption:Function,nodeProps:Function,showCheckmark:{type:Boolean,default:!0},onMousedown:Function,onScroll:Function,onFocus:Function,onBlur:Function,onKeyup:Function,onKeydown:Function,onTabOut:Function,onMouseenter:Function,onMouseleave:Function,onResize:Function,resetMenuOnOptionsChange:{type:Boolean,default:!0},inlineThemeDisabled:Boolean,onToggle:Function}),setup(e){const{mergedClsPrefixRef:n,mergedRtlRef:o}=Ue(e),d=Tt("InternalSelectMenu",o,n),a=pe("InternalSelectMenu","-internal-select-menu",Wn,an,e,ee(e,"clsPrefix")),u=z(null),v=z(null),s=z(null),R=M(()=>e.treeMate.getFlattenedNodes()),C=M(()=>Cn(R.value)),b=z(null);function P(){const{treeMate:i}=e;let f=null;const{value:W}=e;W===null?f=i.getFirstAvailableNode():(e.multiple?f=i.getNode((W||[])[(W||[]).length-1]):f=i.getNode(W),(!f||f.disabled)&&(f=i.getFirstAvailableNode())),N(f||null)}function $(){const{value:i}=b;i&&!e.treeMate.getNode(i.key)&&(b.value=null)}let B;Te(()=>e.show,i=>{i?B=Te(()=>e.treeMate,()=>{e.resetMenuOnOptionsChange?(e.autoPending?P():$(),Ft(A)):$()},{immediate:!0}):B==null||B()},{immediate:!0}),xt(()=>{B==null||B()});const m=M(()=>it(a.value.self[he("optionHeight",e.size)])),x=M(()=>_e(a.value.self[he("padding",e.size)])),H=M(()=>e.multiple&&Array.isArray(e.value)?new Set(e.value):new Set),T=M(()=>{const i=R.value;return i&&i.length===0});function k(i){const{onToggle:f}=e;f&&f(i)}function j(i){const{onScroll:f}=e;f&&f(i)}function X(i){var f;(f=s.value)===null||f===void 0||f.sync(),j(i)}function G(){var i;(i=s.value)===null||i===void 0||i.sync()}function K(){const{value:i}=b;return i||null}function Z(i,f){f.disabled||N(f,!1)}function oe(i,f){f.disabled||k(f)}function ie(i){var f;je(i,"action")||(f=e.onKeyup)===null||f===void 0||f.call(e,i)}function ae(i){var f;je(i,"action")||(f=e.onKeydown)===null||f===void 0||f.call(e,i)}function h(i){var f;(f=e.onMousedown)===null||f===void 0||f.call(e,i),!e.focusable&&i.preventDefault()}function p(){const{value:i}=b;i&&N(i.getNext({loop:!0}),!0)}function w(){const{value:i}=b;i&&N(i.getPrev({loop:!0}),!0)}function N(i,f=!1){b.value=i,f&&A()}function A(){var i,f;const W=b.value;if(!W)return;const ce=C.value(W.key);ce!==null&&(e.virtualScroll?(i=v.value)===null||i===void 0||i.scrollTo({index:ce}):(f=s.value)===null||f===void 0||f.scrollTo({index:ce,elSize:m.value}))}function L(i){var f,W;!((f=u.value)===null||f===void 0)&&f.contains(i.target)&&((W=e.onFocus)===null||W===void 0||W.call(e,i))}function D(i){var f,W;!((f=u.value)===null||f===void 0)&&f.contains(i.relatedTarget)||(W=e.onBlur)===null||W===void 0||W.call(e,i)}ct(st,{handleOptionMouseEnter:Z,handleOptionClick:oe,valueSetRef:H,pendingTmNodeRef:b,nodePropsRef:ee(e,"nodeProps"),showCheckmarkRef:ee(e,"showCheckmark"),multipleRef:ee(e,"multiple"),valueRef:ee(e,"value"),renderLabelRef:ee(e,"renderLabel"),renderOptionRef:ee(e,"renderOption"),labelFieldRef:ee(e,"labelField"),valueFieldRef:ee(e,"valueField")}),ct(Fn,u),Ke(()=>{const{value:i}=s;i&&i.sync()});const V=M(()=>{const{size:i}=e,{common:{cubicBezierEaseInOut:f},self:{height:W,borderRadius:ce,color:ye,groupHeaderTextColor:xe,actionDividerColor:fe,optionTextColorPressed:te,optionTextColor:Ce,optionTextColorDisabled:ve,optionTextColorActive:Fe,optionOpacityDisabled:Oe,optionCheckColor:ze,actionTextColor:Me,optionColorPending:be,optionColorActive:me,loadingColor:Pe,loadingSize:ke,optionColorActivePending:Ie,[he("optionFontSize",i)]:Se,[he("optionHeight",i)]:we,[he("optionPadding",i)]:J}}=a.value;return{"--n-height":W,"--n-action-divider-color":fe,"--n-action-text-color":Me,"--n-bezier":f,"--n-border-radius":ce,"--n-color":ye,"--n-option-font-size":Se,"--n-group-header-text-color":xe,"--n-option-check-color":ze,"--n-option-color-pending":be,"--n-option-color-active":me,"--n-option-color-active-pending":Ie,"--n-option-height":we,"--n-option-opacity-disabled":Oe,"--n-option-text-color":Ce,"--n-option-text-color-active":Fe,"--n-option-text-color-disabled":ve,"--n-option-text-color-pressed":te,"--n-option-padding":J,"--n-option-padding-left":_e(J,"left"),"--n-option-padding-right":_e(J,"right"),"--n-loading-color":Pe,"--n-loading-size":ke}}),{inlineThemeDisabled:Q}=e,Y=Q?qe("internal-select-menu",M(()=>e.size[0]),V,e):void 0,le={selfRef:u,next:p,prev:w,getPendingTmNode:K};return zt(u,e.onResize),Object.assign({mergedTheme:a,mergedClsPrefix:n,rtlEnabled:d,virtualListRef:v,scrollbarRef:s,itemSize:m,padding:x,flattenedNodes:R,empty:T,virtualListContainer(){const{value:i}=v;return i==null?void 0:i.listElRef},virtualListContent(){const{value:i}=v;return i==null?void 0:i.itemsElRef},doScroll:j,handleFocusin:L,handleFocusout:D,handleKeyUp:ie,handleKeyDown:ae,handleMouseDown:h,handleVirtualListResize:G,handleVirtualListScroll:X,cssVars:Q?void 0:V,themeClass:Y==null?void 0:Y.themeClass,onRender:Y==null?void 0:Y.onRender},le)},render(){const{$slots:e,virtualScroll:n,clsPrefix:o,mergedTheme:d,themeClass:a,onRender:u}=this;return u==null||u(),r("div",{ref:"selfRef",tabindex:this.focusable?0:-1,class:[`${o}-base-select-menu`,this.rtlEnabled&&`${o}-base-select-menu--rtl`,a,this.multiple&&`${o}-base-select-menu--multiple`],style:this.cssVars,onFocusin:this.handleFocusin,onFocusout:this.handleFocusout,onKeyup:this.handleKeyUp,onKeydown:this.handleKeyDown,onMousedown:this.handleMouseDown,onMouseenter:this.onMouseenter,onMouseleave:this.onMouseleave},ft(e.header,v=>v&&r("div",{class:`${o}-base-select-menu__header`,"data-header":!0,key:"header"},v)),this.loading?r("div",{class:`${o}-base-select-menu__loading`},r(sn,{clsPrefix:o,strokeWidth:20})):this.empty?r("div",{class:`${o}-base-select-menu__empty`,"data-empty":!0},un(e.empty,()=>[r(Hn,{theme:d.peers.Empty,themeOverrides:d.peerOverrides.Empty})])):r(dn,{ref:"scrollbarRef",theme:d.peers.Scrollbar,themeOverrides:d.peerOverrides.Scrollbar,scrollable:this.scrollable,container:n?this.virtualListContainer:void 0,content:n?this.virtualListContent:void 0,onScroll:n?void 0:this.doScroll},{default:()=>n?r(En,{ref:"virtualListRef",class:`${o}-virtual-list`,items:this.flattenedNodes,itemSize:this.itemSize,showScrollbar:!1,paddingTop:this.padding.top,paddingBottom:this.padding.bottom,onResize:this.handleVirtualListResize,onScroll:this.handleVirtualListScroll,itemResizable:!0},{default:({item:v})=>v.isGroup?r(yt,{key:v.key,clsPrefix:o,tmNode:v}):v.ignored?null:r(wt,{clsPrefix:o,key:v.key,tmNode:v})}):r("div",{class:`${o}-base-select-menu-option-wrapper`,style:{paddingTop:this.padding.top,paddingBottom:this.padding.bottom}},this.flattenedNodes.map(v=>v.isGroup?r(yt,{key:v.key,clsPrefix:o,tmNode:v}):r(wt,{clsPrefix:o,key:v.key,tmNode:v})))}),ft(e.action,v=>v&&[r("div",{class:`${o}-base-select-menu__action`,"data-action":!0,key:"action"},v),r(Ln,{onFocus:this.onTabOut,key:"focus-detector"})]))}}),Un=re([_("base-selection",`
 --n-padding-single: var(--n-padding-single-top) var(--n-padding-single-right) var(--n-padding-single-bottom) var(--n-padding-single-left);
 --n-padding-multiple: var(--n-padding-multiple-top) var(--n-padding-multiple-right) var(--n-padding-multiple-bottom) var(--n-padding-multiple-left);
 position: relative;
 z-index: auto;
 box-shadow: none;
 width: 100%;
 max-width: 100%;
 display: inline-block;
 vertical-align: bottom;
 border-radius: var(--n-border-radius);
 min-height: var(--n-height);
 line-height: 1.5;
 font-size: var(--n-font-size);
 `,[_("base-loading",`
 color: var(--n-loading-color);
 `),_("base-selection-tags","min-height: var(--n-height);"),E("border, state-border",`
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 pointer-events: none;
 border: var(--n-border);
 border-radius: inherit;
 transition:
 box-shadow .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `),E("state-border",`
 z-index: 1;
 border-color: #0000;
 `),_("base-suffix",`
 cursor: pointer;
 position: absolute;
 top: 50%;
 transform: translateY(-50%);
 right: 10px;
 `,[E("arrow",`
 font-size: var(--n-arrow-size);
 color: var(--n-arrow-color);
 transition: color .3s var(--n-bezier);
 `)]),_("base-selection-overlay",`
 display: flex;
 align-items: center;
 white-space: nowrap;
 pointer-events: none;
 position: absolute;
 top: 0;
 right: 0;
 bottom: 0;
 left: 0;
 padding: var(--n-padding-single);
 transition: color .3s var(--n-bezier);
 `,[E("wrapper",`
 flex-basis: 0;
 flex-grow: 1;
 overflow: hidden;
 text-overflow: ellipsis;
 `)]),_("base-selection-placeholder",`
 color: var(--n-placeholder-color);
 `,[E("inner",`
 max-width: 100%;
 overflow: hidden;
 `)]),_("base-selection-tags",`
 cursor: pointer;
 outline: none;
 box-sizing: border-box;
 position: relative;
 z-index: auto;
 display: flex;
 padding: var(--n-padding-multiple);
 flex-wrap: wrap;
 align-items: center;
 width: 100%;
 vertical-align: bottom;
 background-color: var(--n-color);
 border-radius: inherit;
 transition:
 color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `),_("base-selection-label",`
 height: var(--n-height);
 display: inline-flex;
 width: 100%;
 vertical-align: bottom;
 cursor: pointer;
 outline: none;
 z-index: auto;
 box-sizing: border-box;
 position: relative;
 transition:
 color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 border-radius: inherit;
 background-color: var(--n-color);
 align-items: center;
 `,[_("base-selection-input",`
 font-size: inherit;
 line-height: inherit;
 outline: none;
 cursor: pointer;
 box-sizing: border-box;
 border:none;
 width: 100%;
 padding: var(--n-padding-single);
 background-color: #0000;
 color: var(--n-text-color);
 transition: color .3s var(--n-bezier);
 caret-color: var(--n-caret-color);
 `,[E("content",`
 text-overflow: ellipsis;
 overflow: hidden;
 white-space: nowrap; 
 `)]),E("render-label",`
 color: var(--n-text-color);
 `)]),lt("disabled",[re("&:hover",[E("state-border",`
 box-shadow: var(--n-box-shadow-hover);
 border: var(--n-border-hover);
 `)]),ne("focus",[E("state-border",`
 box-shadow: var(--n-box-shadow-focus);
 border: var(--n-border-focus);
 `)]),ne("active",[E("state-border",`
 box-shadow: var(--n-box-shadow-active);
 border: var(--n-border-active);
 `),_("base-selection-label","background-color: var(--n-color-active);"),_("base-selection-tags","background-color: var(--n-color-active);")])]),ne("disabled","cursor: not-allowed;",[E("arrow",`
 color: var(--n-arrow-color-disabled);
 `),_("base-selection-label",`
 cursor: not-allowed;
 background-color: var(--n-color-disabled);
 `,[_("base-selection-input",`
 cursor: not-allowed;
 color: var(--n-text-color-disabled);
 `),E("render-label",`
 color: var(--n-text-color-disabled);
 `)]),_("base-selection-tags",`
 cursor: not-allowed;
 background-color: var(--n-color-disabled);
 `),_("base-selection-placeholder",`
 cursor: not-allowed;
 color: var(--n-placeholder-color-disabled);
 `)]),_("base-selection-input-tag",`
 height: calc(var(--n-height) - 6px);
 line-height: calc(var(--n-height) - 6px);
 outline: none;
 display: none;
 position: relative;
 margin-bottom: 3px;
 max-width: 100%;
 vertical-align: bottom;
 `,[E("input",`
 font-size: inherit;
 font-family: inherit;
 min-width: 1px;
 padding: 0;
 background-color: #0000;
 outline: none;
 border: none;
 max-width: 100%;
 overflow: hidden;
 width: 1em;
 line-height: inherit;
 cursor: pointer;
 color: var(--n-text-color);
 caret-color: var(--n-caret-color);
 `),E("mirror",`
 position: absolute;
 left: 0;
 top: 0;
 white-space: pre;
 visibility: hidden;
 user-select: none;
 -webkit-user-select: none;
 opacity: 0;
 `)]),["warning","error"].map(e=>ne(`${e}-status`,[E("state-border",`border: var(--n-border-${e});`),lt("disabled",[re("&:hover",[E("state-border",`
 box-shadow: var(--n-box-shadow-hover-${e});
 border: var(--n-border-hover-${e});
 `)]),ne("active",[E("state-border",`
 box-shadow: var(--n-box-shadow-active-${e});
 border: var(--n-border-active-${e});
 `),_("base-selection-label",`background-color: var(--n-color-active-${e});`),_("base-selection-tags",`background-color: var(--n-color-active-${e});`)]),ne("focus",[E("state-border",`
 box-shadow: var(--n-box-shadow-focus-${e});
 border: var(--n-border-focus-${e});
 `)])])]))]),_("base-selection-popover",`
 margin-bottom: -3px;
 display: flex;
 flex-wrap: wrap;
 margin-right: -8px;
 `),_("base-selection-tag-wrapper",`
 max-width: 100%;
 display: inline-flex;
 padding: 0 7px 3px 0;
 `,[re("&:last-child","padding-right: 0;"),_("tag",`
 font-size: 14px;
 max-width: 100%;
 `,[E("content",`
 line-height: 1.25;
 text-overflow: ellipsis;
 overflow: hidden;
 `)])])]),qn=ue({name:"InternalSelection",props:Object.assign(Object.assign({},pe.props),{clsPrefix:{type:String,required:!0},bordered:{type:Boolean,default:void 0},active:Boolean,pattern:{type:String,default:""},placeholder:String,selectedOption:{type:Object,default:null},selectedOptions:{type:Array,default:null},labelField:{type:String,default:"label"},valueField:{type:String,default:"value"},multiple:Boolean,filterable:Boolean,clearable:Boolean,disabled:Boolean,size:{type:String,default:"medium"},loading:Boolean,autofocus:Boolean,showArrow:{type:Boolean,default:!0},inputProps:Object,focused:Boolean,renderTag:Function,onKeydown:Function,onClick:Function,onBlur:Function,onFocus:Function,onDeleteOption:Function,maxTagCount:[String,Number],ellipsisTagPopoverProps:Object,onClear:Function,onPatternInput:Function,onPatternFocus:Function,onPatternBlur:Function,renderLabel:Function,status:String,inlineThemeDisabled:Boolean,ignoreComposition:{type:Boolean,default:!0},onResize:Function}),setup(e){const{mergedClsPrefixRef:n,mergedRtlRef:o}=Ue(e),d=Tt("InternalSelection",o,n),a=z(null),u=z(null),v=z(null),s=z(null),R=z(null),C=z(null),b=z(null),P=z(null),$=z(null),B=z(null),m=z(!1),x=z(!1),H=z(!1),T=pe("InternalSelection","-internal-selection",Un,cn,e,ee(e,"clsPrefix")),k=M(()=>e.clearable&&!e.disabled&&(H.value||e.active)),j=M(()=>e.selectedOption?e.renderTag?e.renderTag({option:e.selectedOption,handleClose:()=>{}}):e.renderLabel?e.renderLabel(e.selectedOption,!0):Re(e.selectedOption[e.labelField],e.selectedOption,!0):e.placeholder),X=M(()=>{const l=e.selectedOption;if(l)return l[e.labelField]}),G=M(()=>e.multiple?!!(Array.isArray(e.selectedOptions)&&e.selectedOptions.length):e.selectedOption!==null);function K(){var l;const{value:g}=a;if(g){const{value:U}=u;U&&(U.style.width=`${g.offsetWidth}px`,e.maxTagCount!=="responsive"&&((l=$.value)===null||l===void 0||l.sync({showAllItemsBeforeCalculate:!1})))}}function Z(){const{value:l}=B;l&&(l.style.display="none")}function oe(){const{value:l}=B;l&&(l.style.display="inline-block")}Te(ee(e,"active"),l=>{l||Z()}),Te(ee(e,"pattern"),()=>{e.multiple&&Ft(K)});function ie(l){const{onFocus:g}=e;g&&g(l)}function ae(l){const{onBlur:g}=e;g&&g(l)}function h(l){const{onDeleteOption:g}=e;g&&g(l)}function p(l){const{onClear:g}=e;g&&g(l)}function w(l){const{onPatternInput:g}=e;g&&g(l)}function N(l){var g;(!l.relatedTarget||!(!((g=v.value)===null||g===void 0)&&g.contains(l.relatedTarget)))&&ie(l)}function A(l){var g;!((g=v.value)===null||g===void 0)&&g.contains(l.relatedTarget)||ae(l)}function L(l){p(l)}function D(){H.value=!0}function V(){H.value=!1}function Q(l){!e.active||!e.filterable||l.target!==u.value&&l.preventDefault()}function Y(l){h(l)}function le(l){if(l.key==="Backspace"&&!i.value&&!e.pattern.length){const{selectedOptions:g}=e;g!=null&&g.length&&Y(g[g.length-1])}}const i=z(!1);let f=null;function W(l){const{value:g}=a;if(g){const U=l.target.value;g.textContent=U,K()}e.ignoreComposition&&i.value?f=l:w(l)}function ce(){i.value=!0}function ye(){i.value=!1,e.ignoreComposition&&w(f),f=null}function xe(l){var g;x.value=!0,(g=e.onPatternFocus)===null||g===void 0||g.call(e,l)}function fe(l){var g;x.value=!1,(g=e.onPatternBlur)===null||g===void 0||g.call(e,l)}function te(){var l,g;if(e.filterable)x.value=!1,(l=C.value)===null||l===void 0||l.blur(),(g=u.value)===null||g===void 0||g.blur();else if(e.multiple){const{value:U}=s;U==null||U.blur()}else{const{value:U}=R;U==null||U.blur()}}function Ce(){var l,g,U;e.filterable?(x.value=!1,(l=C.value)===null||l===void 0||l.focus()):e.multiple?(g=s.value)===null||g===void 0||g.focus():(U=R.value)===null||U===void 0||U.focus()}function ve(){const{value:l}=u;l&&(oe(),l.focus())}function Fe(){const{value:l}=u;l&&l.blur()}function Oe(l){const{value:g}=b;g&&g.setTextContent(`+${l}`)}function ze(){const{value:l}=P;return l}function Me(){return u.value}let be=null;function me(){be!==null&&window.clearTimeout(be)}function Pe(){e.active||(me(),be=window.setTimeout(()=>{G.value&&(m.value=!0)},100))}function ke(){me()}function Ie(l){l||(me(),m.value=!1)}Te(G,l=>{l||(m.value=!1)}),Ke(()=>{fn(()=>{const l=C.value;l&&(e.disabled?l.removeAttribute("tabindex"):l.tabIndex=x.value?-1:0)})}),zt(v,e.onResize);const{inlineThemeDisabled:Se}=e,we=M(()=>{const{size:l}=e,{common:{cubicBezierEaseInOut:g},self:{borderRadius:U,color:Ge,placeholderColor:Ye,textColor:Be,paddingSingle:$e,paddingMultiple:Ee,caretColor:Ze,colorDisabled:Xe,textColorDisabled:Ne,placeholderColorDisabled:ge,colorActive:t,boxShadowFocus:c,boxShadowActive:y,boxShadowHover:I,border:F,borderFocus:S,borderHover:O,borderActive:q,arrowColor:se,arrowColorDisabled:Qe,loadingColor:Pt,colorActiveWarning:kt,boxShadowFocusWarning:It,boxShadowActiveWarning:_t,boxShadowHoverWarning:Bt,borderWarning:$t,borderFocusWarning:Et,borderHoverWarning:Nt,borderActiveWarning:At,colorActiveError:Lt,boxShadowFocusError:Dt,boxShadowActiveError:Vt,boxShadowHoverError:Ht,borderError:jt,borderFocusError:Wt,borderHoverError:Kt,borderActiveError:Ut,clearColor:qt,clearColorHover:Gt,clearColorPressed:Yt,clearSize:Zt,arrowSize:Xt,[he("height",l)]:Qt,[he("fontSize",l)]:Jt}}=T.value,Ae=_e($e),Le=_e(Ee);return{"--n-bezier":g,"--n-border":F,"--n-border-active":q,"--n-border-focus":S,"--n-border-hover":O,"--n-border-radius":U,"--n-box-shadow-active":y,"--n-box-shadow-focus":c,"--n-box-shadow-hover":I,"--n-caret-color":Ze,"--n-color":Ge,"--n-color-active":t,"--n-color-disabled":Xe,"--n-font-size":Jt,"--n-height":Qt,"--n-padding-single-top":Ae.top,"--n-padding-multiple-top":Le.top,"--n-padding-single-right":Ae.right,"--n-padding-multiple-right":Le.right,"--n-padding-single-left":Ae.left,"--n-padding-multiple-left":Le.left,"--n-padding-single-bottom":Ae.bottom,"--n-padding-multiple-bottom":Le.bottom,"--n-placeholder-color":Ye,"--n-placeholder-color-disabled":ge,"--n-text-color":Be,"--n-text-color-disabled":Ne,"--n-arrow-color":se,"--n-arrow-color-disabled":Qe,"--n-loading-color":Pt,"--n-color-active-warning":kt,"--n-box-shadow-focus-warning":It,"--n-box-shadow-active-warning":_t,"--n-box-shadow-hover-warning":Bt,"--n-border-warning":$t,"--n-border-focus-warning":Et,"--n-border-hover-warning":Nt,"--n-border-active-warning":At,"--n-color-active-error":Lt,"--n-box-shadow-focus-error":Dt,"--n-box-shadow-active-error":Vt,"--n-box-shadow-hover-error":Ht,"--n-border-error":jt,"--n-border-focus-error":Wt,"--n-border-hover-error":Kt,"--n-border-active-error":Ut,"--n-clear-size":Zt,"--n-clear-color":qt,"--n-clear-color-hover":Gt,"--n-clear-color-pressed":Yt,"--n-arrow-size":Xt}}),J=Se?qe("internal-selection",M(()=>e.size[0]),we,e):void 0;return{mergedTheme:T,mergedClearable:k,mergedClsPrefix:n,rtlEnabled:d,patternInputFocused:x,filterablePlaceholder:j,label:X,selected:G,showTagsPanel:m,isComposing:i,counterRef:b,counterWrapperRef:P,patternInputMirrorRef:a,patternInputRef:u,selfRef:v,multipleElRef:s,singleElRef:R,patternInputWrapperRef:C,overflowRef:$,inputTagElRef:B,handleMouseDown:Q,handleFocusin:N,handleClear:L,handleMouseEnter:D,handleMouseLeave:V,handleDeleteOption:Y,handlePatternKeyDown:le,handlePatternInputInput:W,handlePatternInputBlur:fe,handlePatternInputFocus:xe,handleMouseEnterCounter:Pe,handleMouseLeaveCounter:ke,handleFocusout:A,handleCompositionEnd:ye,handleCompositionStart:ce,onPopoverUpdateShow:Ie,focus:Ce,focusInput:ve,blur:te,blurInput:Fe,updateCounter:Oe,getCounter:ze,getTail:Me,renderLabel:e.renderLabel,cssVars:Se?void 0:we,themeClass:J==null?void 0:J.themeClass,onRender:J==null?void 0:J.onRender}},render(){const{status:e,multiple:n,size:o,disabled:d,filterable:a,maxTagCount:u,bordered:v,clsPrefix:s,ellipsisTagPopoverProps:R,onRender:C,renderTag:b,renderLabel:P}=this;C==null||C();const $=u==="responsive",B=typeof u=="number",m=$||B,x=r(vn,null,{default:()=>r(In,{clsPrefix:s,loading:this.loading,showArrow:this.showArrow,showClear:this.mergedClearable&&this.selected,onClear:this.handleClear},{default:()=>{var T,k;return(k=(T=this.$slots).arrow)===null||k===void 0?void 0:k.call(T)}})});let H;if(n){const{labelField:T}=this,k=w=>r("div",{class:`${s}-base-selection-tag-wrapper`,key:w.value},b?b({option:w,handleClose:()=>{this.handleDeleteOption(w)}}):r(Je,{size:o,closable:!w.disabled,disabled:d,onClose:()=>{this.handleDeleteOption(w)},internalCloseIsButtonTag:!1,internalCloseFocusable:!1},{default:()=>P?P(w,!0):Re(w[T],w,!0)})),j=()=>(B?this.selectedOptions.slice(0,u):this.selectedOptions).map(k),X=a?r("div",{class:`${s}-base-selection-input-tag`,ref:"inputTagElRef",key:"__input-tag__"},r("input",Object.assign({},this.inputProps,{ref:"patternInputRef",tabindex:-1,disabled:d,value:this.pattern,autofocus:this.autofocus,class:`${s}-base-selection-input-tag__input`,onBlur:this.handlePatternInputBlur,onFocus:this.handlePatternInputFocus,onKeydown:this.handlePatternKeyDown,onInput:this.handlePatternInputInput,onCompositionstart:this.handleCompositionStart,onCompositionend:this.handleCompositionEnd})),r("span",{ref:"patternInputMirrorRef",class:`${s}-base-selection-input-tag__mirror`},this.pattern)):null,G=$?()=>r("div",{class:`${s}-base-selection-tag-wrapper`,ref:"counterWrapperRef"},r(Je,{size:o,ref:"counterRef",onMouseenter:this.handleMouseEnterCounter,onMouseleave:this.handleMouseLeaveCounter,disabled:d})):void 0;let K;if(B){const w=this.selectedOptions.length-u;w>0&&(K=r("div",{class:`${s}-base-selection-tag-wrapper`,key:"__counter__"},r(Je,{size:o,ref:"counterRef",onMouseenter:this.handleMouseEnterCounter,disabled:d},{default:()=>`+${w}`})))}const Z=$?a?r(gt,{ref:"overflowRef",updateCounter:this.updateCounter,getCounter:this.getCounter,getTail:this.getTail,style:{width:"100%",display:"flex",overflow:"hidden"}},{default:j,counter:G,tail:()=>X}):r(gt,{ref:"overflowRef",updateCounter:this.updateCounter,getCounter:this.getCounter,style:{width:"100%",display:"flex",overflow:"hidden"}},{default:j,counter:G}):B&&K?j().concat(K):j(),oe=m?()=>r("div",{class:`${s}-base-selection-popover`},$?j():this.selectedOptions.map(k)):void 0,ie=m?Object.assign({show:this.showTagsPanel,trigger:"hover",overlap:!0,placement:"top",width:"trigger",onUpdateShow:this.onPopoverUpdateShow,theme:this.mergedTheme.peers.Popover,themeOverrides:this.mergedTheme.peerOverrides.Popover},R):null,h=(this.selected?!1:this.active?!this.pattern&&!this.isComposing:!0)?r("div",{class:`${s}-base-selection-placeholder ${s}-base-selection-overlay`},r("div",{class:`${s}-base-selection-placeholder__inner`},this.placeholder)):null,p=a?r("div",{ref:"patternInputWrapperRef",class:`${s}-base-selection-tags`},Z,$?null:X,x):r("div",{ref:"multipleElRef",class:`${s}-base-selection-tags`,tabindex:d?void 0:0},Z,x);H=r(hn,null,m?r(On,Object.assign({},ie,{scrollable:!0,style:"max-height: calc(var(--v-target-height) * 6.6);"}),{trigger:()=>p,default:oe}):p,h)}else if(a){const T=this.pattern||this.isComposing,k=this.active?!T:!this.selected,j=this.active?!1:this.selected;H=r("div",{ref:"patternInputWrapperRef",class:`${s}-base-selection-label`,title:this.patternInputFocused?void 0:pt(this.label)},r("input",Object.assign({},this.inputProps,{ref:"patternInputRef",class:`${s}-base-selection-input`,value:this.active?this.pattern:"",placeholder:"",readonly:d,disabled:d,tabindex:-1,autofocus:this.autofocus,onFocus:this.handlePatternInputFocus,onBlur:this.handlePatternInputBlur,onInput:this.handlePatternInputInput,onCompositionstart:this.handleCompositionStart,onCompositionend:this.handleCompositionEnd})),j?r("div",{class:`${s}-base-selection-label__render-label ${s}-base-selection-overlay`,key:"input"},r("div",{class:`${s}-base-selection-overlay__wrapper`},b?b({option:this.selectedOption,handleClose:()=>{}}):P?P(this.selectedOption,!0):Re(this.label,this.selectedOption,!0))):null,k?r("div",{class:`${s}-base-selection-placeholder ${s}-base-selection-overlay`,key:"placeholder"},r("div",{class:`${s}-base-selection-overlay__wrapper`},this.filterablePlaceholder)):null,x)}else H=r("div",{ref:"singleElRef",class:`${s}-base-selection-label`,tabindex:this.disabled?void 0:0},this.label!==void 0?r("div",{class:`${s}-base-selection-input`,title:pt(this.label),key:"input"},r("div",{class:`${s}-base-selection-input__content`},b?b({option:this.selectedOption,handleClose:()=>{}}):P?P(this.selectedOption,!0):Re(this.label,this.selectedOption,!0))):r("div",{class:`${s}-base-selection-placeholder ${s}-base-selection-overlay`,key:"placeholder"},r("div",{class:`${s}-base-selection-placeholder__inner`},this.placeholder)),x);return r("div",{ref:"selfRef",class:[`${s}-base-selection`,this.rtlEnabled&&`${s}-base-selection--rtl`,this.themeClass,e&&`${s}-base-selection--${e}-status`,{[`${s}-base-selection--active`]:this.active,[`${s}-base-selection--selected`]:this.selected||this.active&&this.pattern,[`${s}-base-selection--disabled`]:this.disabled,[`${s}-base-selection--multiple`]:this.multiple,[`${s}-base-selection--focus`]:this.focused}],style:this.cssVars,onClick:this.onClick,onMouseenter:this.handleMouseEnter,onMouseleave:this.handleMouseLeave,onKeydown:this.onKeydown,onFocusin:this.handleFocusin,onFocusout:this.handleFocusout,onMousedown:this.handleMouseDown},H,v?r("div",{class:`${s}-base-selection__border`}):null,v?r("div",{class:`${s}-base-selection__state-border`}):null)}});function We(e){return e.type==="group"}function Mt(e){return e.type==="ignored"}function ot(e,n){try{return!!(1+n.toString().toLowerCase().indexOf(e.trim().toLowerCase()))}catch(o){return!1}}function Gn(e,n){return{getIsGroup:We,getIgnored:Mt,getKey(d){return We(d)?d.name||d.key||"key-required":d[e]},getChildren(d){return d[n]}}}function Yn(e,n,o,d){if(!n)return e;function a(u){if(!Array.isArray(u))return[];const v=[];for(const s of u)if(We(s)){const R=a(s[d]);R.length&&v.push(Object.assign({},s,{[d]:R}))}else{if(Mt(s))continue;n(o,s)&&v.push(s)}return v}return a(e)}function Zn(e,n,o){const d=new Map;return e.forEach(a=>{We(a)?a[o].forEach(u=>{d.set(u[n],u)}):d.set(a[n],a)}),d}const Xn=re([_("select",`
 z-index: auto;
 outline: none;
 width: 100%;
 position: relative;
 `),_("select-menu",`
 margin: 4px 0;
 box-shadow: var(--n-menu-box-shadow);
 `,[Rt({originalTransition:"background-color .3s var(--n-bezier), box-shadow .3s var(--n-bezier)"})])]),Qn=Object.assign(Object.assign({},pe.props),{to:rt.propTo,bordered:{type:Boolean,default:void 0},clearable:Boolean,clearFilterAfterSelect:{type:Boolean,default:!0},options:{type:Array,default:()=>[]},defaultValue:{type:[String,Number,Array],default:null},keyboard:{type:Boolean,default:!0},value:[String,Number,Array],placeholder:String,menuProps:Object,multiple:Boolean,size:String,filterable:Boolean,disabled:{type:Boolean,default:void 0},remote:Boolean,loading:Boolean,filter:Function,placement:{type:String,default:"bottom-start"},widthMode:{type:String,default:"trigger"},tag:Boolean,onCreate:Function,fallbackOption:{type:[Function,Boolean],default:void 0},show:{type:Boolean,default:void 0},showArrow:{type:Boolean,default:!0},maxTagCount:[Number,String],ellipsisTagPopoverProps:Object,consistentMenuWidth:{type:Boolean,default:!0},virtualScroll:{type:Boolean,default:!0},labelField:{type:String,default:"label"},valueField:{type:String,default:"value"},childrenField:{type:String,default:"children"},renderLabel:Function,renderOption:Function,renderTag:Function,"onUpdate:value":[Function,Array],inputProps:Object,nodeProps:Function,ignoreComposition:{type:Boolean,default:!0},showOnFocus:Boolean,onUpdateValue:[Function,Array],onBlur:[Function,Array],onClear:[Function,Array],onFocus:[Function,Array],onScroll:[Function,Array],onSearch:[Function,Array],onUpdateShow:[Function,Array],"onUpdate:show":[Function,Array],displayDirective:{type:String,default:"show"},resetMenuOnOptionsChange:{type:Boolean,default:!0},status:String,showCheckmark:{type:Boolean,default:!0},onChange:[Function,Array],items:Array}),io=ue({name:"Select",props:Qn,setup(e){const{mergedClsPrefixRef:n,mergedBorderedRef:o,namespaceRef:d,inlineThemeDisabled:a}=Ue(e),u=pe("Select","-select",Xn,gn,e,n),v=z(e.defaultValue),s=ee(e,"value"),R=vt(s,v),C=z(!1),b=z(""),P=M(()=>{const{valueField:t,childrenField:c}=e,y=Gn(t,c);return Sn(p.value,y)}),$=M(()=>Zn(ae.value,e.valueField,e.childrenField)),B=z(!1),m=vt(ee(e,"show"),B),x=z(null),H=z(null),T=z(null),{localeRef:k}=Ot("Select"),j=M(()=>{var t;return(t=e.placeholder)!==null&&t!==void 0?t:k.value.placeholder}),X=zn(e,["items","options"]),G=[],K=z([]),Z=z([]),oe=z(new Map),ie=M(()=>{const{fallbackOption:t}=e;if(t===void 0){const{labelField:c,valueField:y}=e;return I=>({[c]:String(I),[y]:I})}return t===!1?!1:c=>Object.assign(t(c),{value:c})}),ae=M(()=>Z.value.concat(K.value).concat(X.value)),h=M(()=>{const{filter:t}=e;if(t)return t;const{labelField:c,valueField:y}=e;return(I,F)=>{if(!F)return!1;const S=F[c];if(typeof S=="string")return ot(I,S);const O=F[y];return typeof O=="string"?ot(I,O):typeof O=="number"?ot(I,String(O)):!1}}),p=M(()=>{if(e.remote)return X.value;{const{value:t}=ae,{value:c}=b;return!c.length||!e.filterable?t:Yn(t,h.value,c,e.childrenField)}});function w(t){const c=e.remote,{value:y}=oe,{value:I}=$,{value:F}=ie,S=[];return t.forEach(O=>{if(I.has(O))S.push(I.get(O));else if(c&&y.has(O))S.push(y.get(O));else if(F){const q=F(O);q&&S.push(q)}}),S}const N=M(()=>{if(e.multiple){const{value:t}=R;return Array.isArray(t)?w(t):[]}return null}),A=M(()=>{const{value:t}=R;return!e.multiple&&!Array.isArray(t)?t===null?null:w([t])[0]||null:null}),L=pn(e),{mergedSizeRef:D,mergedDisabledRef:V,mergedStatusRef:Q}=L;function Y(t,c){const{onChange:y,"onUpdate:value":I,onUpdateValue:F}=e,{nTriggerFormChange:S,nTriggerFormInput:O}=L;y&&de(y,t,c),F&&de(F,t,c),I&&de(I,t,c),v.value=t,S(),O()}function le(t){const{onBlur:c}=e,{nTriggerFormBlur:y}=L;c&&de(c,t),y()}function i(){const{onClear:t}=e;t&&de(t)}function f(t){const{onFocus:c,showOnFocus:y}=e,{nTriggerFormFocus:I}=L;c&&de(c,t),I(),y&&fe()}function W(t){const{onSearch:c}=e;c&&de(c,t)}function ce(t){const{onScroll:c}=e;c&&de(c,t)}function ye(){var t;const{remote:c,multiple:y}=e;if(c){const{value:I}=oe;if(y){const{valueField:F}=e;(t=N.value)===null||t===void 0||t.forEach(S=>{I.set(S[F],S)})}else{const F=A.value;F&&I.set(F[e.valueField],F)}}}function xe(t){const{onUpdateShow:c,"onUpdate:show":y}=e;c&&de(c,t),y&&de(y,t),B.value=t}function fe(){V.value||(xe(!0),B.value=!0,e.filterable&&Ee())}function te(){xe(!1)}function Ce(){b.value="",Z.value=G}const ve=z(!1);function Fe(){e.filterable&&(ve.value=!0)}function Oe(){e.filterable&&(ve.value=!1,m.value||Ce())}function ze(){V.value||(m.value?e.filterable?Ee():te():fe())}function Me(t){var c,y;!((y=(c=T.value)===null||c===void 0?void 0:c.selfRef)===null||y===void 0)&&y.contains(t.relatedTarget)||(C.value=!1,le(t),te())}function be(t){f(t),C.value=!0}function me(t){C.value=!0}function Pe(t){var c;!((c=x.value)===null||c===void 0)&&c.$el.contains(t.relatedTarget)||(C.value=!1,le(t),te())}function ke(){var t;(t=x.value)===null||t===void 0||t.focus(),te()}function Ie(t){var c;m.value&&(!((c=x.value)===null||c===void 0)&&c.$el.contains(yn(t))||te())}function Se(t){if(!Array.isArray(t))return[];if(ie.value)return Array.from(t);{const{remote:c}=e,{value:y}=$;if(c){const{value:I}=oe;return t.filter(F=>y.has(F)||I.has(F))}else return t.filter(I=>y.has(I))}}function we(t){J(t.rawNode)}function J(t){if(V.value)return;const{tag:c,remote:y,clearFilterAfterSelect:I,valueField:F}=e;if(c&&!y){const{value:S}=Z,O=S[0]||null;if(O){const q=K.value;q.length?q.push(O):K.value=[O],Z.value=G}}if(y&&oe.value.set(t[F],t),e.multiple){const S=Se(R.value),O=S.findIndex(q=>q===t[F]);if(~O){if(S.splice(O,1),c&&!y){const q=l(t[F]);~q&&(K.value.splice(q,1),I&&(b.value=""))}}else S.push(t[F]),I&&(b.value="");Y(S,w(S))}else{if(c&&!y){const S=l(t[F]);~S?K.value=[K.value[S]]:K.value=G}$e(),te(),Y(t[F],t)}}function l(t){return K.value.findIndex(y=>y[e.valueField]===t)}function g(t){m.value||fe();const{value:c}=t.target;b.value=c;const{tag:y,remote:I}=e;if(W(c),y&&!I){if(!c){Z.value=G;return}const{onCreate:F}=e,S=F?F(c):{[e.labelField]:c,[e.valueField]:c},{valueField:O,labelField:q}=e;X.value.some(se=>se[O]===S[O]||se[q]===S[q])||K.value.some(se=>se[O]===S[O]||se[q]===S[q])?Z.value=G:Z.value=[S]}}function U(t){t.stopPropagation();const{multiple:c}=e;!c&&e.filterable&&te(),i(),c?Y([],[]):Y(null,null)}function Ge(t){!je(t,"action")&&!je(t,"empty")&&t.preventDefault()}function Ye(t){ce(t)}function Be(t){var c,y,I,F,S;if(!e.keyboard){t.preventDefault();return}switch(t.key){case" ":if(e.filterable)break;t.preventDefault();case"Enter":if(!(!((c=x.value)===null||c===void 0)&&c.isComposing)){if(m.value){const O=(y=T.value)===null||y===void 0?void 0:y.getPendingTmNode();O?we(O):e.filterable||(te(),$e())}else if(fe(),e.tag&&ve.value){const O=Z.value[0];if(O){const q=O[e.valueField],{value:se}=R;e.multiple&&Array.isArray(se)&&se.some(Qe=>Qe===q)||J(O)}}}t.preventDefault();break;case"ArrowUp":if(t.preventDefault(),e.loading)return;m.value&&((I=T.value)===null||I===void 0||I.prev());break;case"ArrowDown":if(t.preventDefault(),e.loading)return;m.value?(F=T.value)===null||F===void 0||F.next():fe();break;case"Escape":m.value&&(xn(t),te()),(S=x.value)===null||S===void 0||S.focus();break}}function $e(){var t;(t=x.value)===null||t===void 0||t.focus()}function Ee(){var t;(t=x.value)===null||t===void 0||t.focusInput()}function Ze(){var t;m.value&&((t=H.value)===null||t===void 0||t.syncPosition())}ye(),Te(ee(e,"options"),ye);const Xe={focus:()=>{var t;(t=x.value)===null||t===void 0||t.focus()},focusInput:()=>{var t;(t=x.value)===null||t===void 0||t.focusInput()},blur:()=>{var t;(t=x.value)===null||t===void 0||t.blur()},blurInput:()=>{var t;(t=x.value)===null||t===void 0||t.blurInput()}},Ne=M(()=>{const{self:{menuBoxShadow:t}}=u.value;return{"--n-menu-box-shadow":t}}),ge=a?qe("select",void 0,Ne,e):void 0;return Object.assign(Object.assign({},Xe),{mergedStatus:Q,mergedClsPrefix:n,mergedBordered:o,namespace:d,treeMate:P,isMounted:bn(),triggerRef:x,menuRef:T,pattern:b,uncontrolledShow:B,mergedShow:m,adjustedTo:rt(e),uncontrolledValue:v,mergedValue:R,followerRef:H,localizedPlaceholder:j,selectedOption:A,selectedOptions:N,mergedSize:D,mergedDisabled:V,focused:C,activeWithoutMenuOpen:ve,inlineThemeDisabled:a,onTriggerInputFocus:Fe,onTriggerInputBlur:Oe,handleTriggerOrMenuResize:Ze,handleMenuFocus:me,handleMenuBlur:Pe,handleMenuTabOut:ke,handleTriggerClick:ze,handleToggle:we,handleDeleteOption:J,handlePatternInput:g,handleClear:U,handleTriggerBlur:Me,handleTriggerFocus:be,handleKeydown:Be,handleMenuAfterLeave:Ce,handleMenuClickOutside:Ie,handleMenuScroll:Ye,handleMenuKeydown:Be,handleMenuMousedown:Ge,mergedTheme:u,cssVars:a?void 0:Ne,themeClass:ge==null?void 0:ge.themeClass,onRender:ge==null?void 0:ge.onRender})},render(){return r("div",{class:`${this.mergedClsPrefix}-select`},r(Mn,null,{default:()=>[r(Pn,null,{default:()=>r(qn,{ref:"triggerRef",inlineThemeDisabled:this.inlineThemeDisabled,status:this.mergedStatus,inputProps:this.inputProps,clsPrefix:this.mergedClsPrefix,showArrow:this.showArrow,maxTagCount:this.maxTagCount,ellipsisTagPopoverProps:this.ellipsisTagPopoverProps,bordered:this.mergedBordered,active:this.activeWithoutMenuOpen||this.mergedShow,pattern:this.pattern,placeholder:this.localizedPlaceholder,selectedOption:this.selectedOption,selectedOptions:this.selectedOptions,multiple:this.multiple,renderTag:this.renderTag,renderLabel:this.renderLabel,filterable:this.filterable,clearable:this.clearable,disabled:this.mergedDisabled,size:this.mergedSize,theme:this.mergedTheme.peers.InternalSelection,labelField:this.labelField,valueField:this.valueField,themeOverrides:this.mergedTheme.peerOverrides.InternalSelection,loading:this.loading,focused:this.focused,onClick:this.handleTriggerClick,onDeleteOption:this.handleDeleteOption,onPatternInput:this.handlePatternInput,onClear:this.handleClear,onBlur:this.handleTriggerBlur,onFocus:this.handleTriggerFocus,onKeydown:this.handleKeydown,onPatternBlur:this.onTriggerInputBlur,onPatternFocus:this.onTriggerInputFocus,onResize:this.handleTriggerOrMenuResize,ignoreComposition:this.ignoreComposition},{arrow:()=>{var e,n;return[(n=(e=this.$slots).arrow)===null||n===void 0?void 0:n.call(e)]}})}),r(kn,{ref:"followerRef",show:this.mergedShow,to:this.adjustedTo,teleportDisabled:this.adjustedTo===rt.tdkey,containerClass:this.namespace,width:this.consistentMenuWidth?"target":void 0,minWidth:"target",placement:this.placement},{default:()=>r(St,{name:"fade-in-scale-up-transition",appear:this.isMounted,onAfterLeave:this.handleMenuAfterLeave},{default:()=>{var e,n,o;return this.mergedShow||this.displayDirective==="show"?((e=this.onRender)===null||e===void 0||e.call(this),mn(r(Kn,Object.assign({},this.menuProps,{ref:"menuRef",onResize:this.handleTriggerOrMenuResize,inlineThemeDisabled:this.inlineThemeDisabled,virtualScroll:this.consistentMenuWidth&&this.virtualScroll,class:[`${this.mergedClsPrefix}-select-menu`,this.themeClass,(n=this.menuProps)===null||n===void 0?void 0:n.class],clsPrefix:this.mergedClsPrefix,focusable:!0,labelField:this.labelField,valueField:this.valueField,autoPending:!0,nodeProps:this.nodeProps,theme:this.mergedTheme.peers.InternalSelectMenu,themeOverrides:this.mergedTheme.peerOverrides.InternalSelectMenu,treeMate:this.treeMate,multiple:this.multiple,size:"medium",renderOption:this.renderOption,renderLabel:this.renderLabel,value:this.mergedValue,style:[(o=this.menuProps)===null||o===void 0?void 0:o.style,this.cssVars],onToggle:this.handleToggle,onScroll:this.handleMenuScroll,onFocus:this.handleMenuFocus,onBlur:this.handleMenuBlur,onKeydown:this.handleMenuKeydown,onTabOut:this.handleMenuTabOut,onMousedown:this.handleMenuMousedown,show:this.mergedShow,showCheckmark:this.showCheckmark,resetMenuOnOptionsChange:this.resetMenuOnOptionsChange}),{empty:()=>{var d,a;return[(a=(d=this.$slots).empty)===null||a===void 0?void 0:a.call(d)]},header:()=>{var d,a;return[(a=(d=this.$slots).header)===null||a===void 0?void 0:a.call(d)]},action:()=>{var d,a;return[(a=(d=this.$slots).action)===null||a===void 0?void 0:a.call(d)]}}),this.displayDirective==="show"?[[wn,this.mergedShow],[ht,this.handleMenuClickOutside,void 0,{capture:!0}]]:[[ht,this.handleMenuClickOutside,void 0,{capture:!0}]])):null}})})]}))}});export{Ln as F,Kn as N,En as V,io as _,Hn as a,qn as b,Gn as c,tt as m,zt as u};
