var ko=Object.defineProperty,Ro=Object.defineProperties;var $o=Object.getOwnPropertyDescriptors;var Ee=Object.getOwnPropertySymbols;var Po=Object.prototype.hasOwnProperty,To=Object.prototype.propertyIsEnumerable;var Oe=(e,t,o)=>t in e?ko(e,t,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[t]=o,Fe=(e,t)=>{for(var o in t||(t={}))Po.call(t,o)&&Oe(e,o,t[o]);if(Ee)for(var o of Ee(t))To.call(t,o)&&Oe(e,o,t[o]);return e},je=(e,t)=>Ro(e,$o(t));var de=(e,t,o)=>new Promise((l,i)=>{var r=s=>{try{u(o.next(s))}catch(m){i(m)}},c=s=>{try{u(o.throw(s))}catch(m){i(m)}},u=s=>s.done?l(s.value):Promise.resolve(s.value).then(r,c);u((o=o.apply(e,t)).next())});import{d as U,h as _,c as b,a as z,b as A,e as g,u as he,f as Z,g as Ao,p as J,t as ie,i as S,j as me,k as te,r as E,o as Ye,l as No,m as Bo,n as Y,q as Mo,s as Ho,v as Lo,w as Eo,x as Ke,y as Xe,N as Ze,z as Je,A as W,B as oe,F as ne,C as Ce,D as Oo,E as be,G as Pe,H as re,I as Fo,J as jo,K as ye,L as Ko,V as Vo,M as le,O as ve,P as y,Q as M,R as V,S as j,T as Qe,U as I,W as eo,X as oo,Y as pe,Z as O,_ as ee,$ as L,a0 as Do,a1 as Uo,a2 as Wo,a3 as Go,a4 as qo,a5 as Ve,a6 as to,a7 as no,a8 as Yo,a9 as Xo,aa as we,ab as ze,ac as De,ad as Zo,ae as fe,af as ro,ag as Jo,ah as Qo,ai as et,aj as ot,ak as Se,al as tt,am as Ie,an as Ue,ao as io,ap as nt,aq as rt,ar as We}from"./index-71df545f.js";import{r as lo,a as q,N as ae,_ as it}from"./TheIcon-fd522b76.js";import{C as lt,_ as Te}from"./Dropdown-1844784f.js";import{N as at}from"./Image-acaaa9de.js";import{N as ct}from"./Tooltip-86f1074b.js";import{c as _e,V as st,_ as dt}from"./Tag-ef52fed7.js";import{u as ke}from"./use-locale-b5fb7986.js";import{u as ut}from"./Popover-3620166f.js";import{_ as ht}from"./_plugin-vue_export-helper-c27b6911.js";import{f as xe}from"./format-length-c9d165c6.js";const mt=U({name:"ChevronDownFilled",render(){return _("svg",{viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg"},_("path",{d:"M3.20041 5.73966C3.48226 5.43613 3.95681 5.41856 4.26034 5.70041L8 9.22652L11.7397 5.70041C12.0432 5.41856 12.5177 5.43613 12.7996 5.73966C13.0815 6.0432 13.0639 6.51775 12.7603 6.7996L8.51034 10.7996C8.22258 11.0668 7.77743 11.0668 7.48967 10.7996L3.23966 6.7996C2.93613 6.51775 2.91856 6.0432 3.20041 5.73966Z",fill:"currentColor"}))}}),vt=b("breadcrumb",`
 white-space: nowrap;
 cursor: default;
 line-height: var(--n-item-line-height);
`,[z("ul",`
 list-style: none;
 padding: 0;
 margin: 0;
 `),z("a",`
 color: inherit;
 text-decoration: inherit;
 `),b("breadcrumb-item",`
 font-size: var(--n-font-size);
 transition: color .3s var(--n-bezier);
 display: inline-flex;
 align-items: center;
 `,[b("icon",`
 font-size: 18px;
 vertical-align: -.2em;
 transition: color .3s var(--n-bezier);
 color: var(--n-item-text-color);
 `),z("&:not(:last-child)",[A("clickable",[g("link",`
 cursor: pointer;
 `,[z("&:hover",`
 background-color: var(--n-item-color-hover);
 `),z("&:active",`
 background-color: var(--n-item-color-pressed); 
 `)])])]),g("link",`
 padding: 4px;
 border-radius: var(--n-item-border-radius);
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 color: var(--n-item-text-color);
 position: relative;
 `,[z("&:hover",`
 color: var(--n-item-text-color-hover);
 `,[b("icon",`
 color: var(--n-item-text-color-hover);
 `)]),z("&:active",`
 color: var(--n-item-text-color-pressed);
 `,[b("icon",`
 color: var(--n-item-text-color-pressed);
 `)])]),g("separator",`
 margin: 0 8px;
 color: var(--n-separator-color);
 transition: color .3s var(--n-bezier);
 user-select: none;
 -webkit-user-select: none;
 `),z("&:last-child",[g("link",`
 font-weight: var(--n-font-weight-active);
 cursor: unset;
 color: var(--n-item-text-color-active);
 `,[b("icon",`
 color: var(--n-item-text-color-active);
 `)]),g("separator",`
 display: none;
 `)])])]),ao=te("n-breadcrumb"),pt=Object.assign(Object.assign({},Z.props),{separator:{type:String,default:"/"}}),ft=U({name:"Breadcrumb",props:pt,setup(e){const{mergedClsPrefixRef:t,inlineThemeDisabled:o}=he(e),l=Z("Breadcrumb","-breadcrumb",vt,Ao,e,t);J(ao,{separatorRef:ie(e,"separator"),mergedClsPrefixRef:t});const i=S(()=>{const{common:{cubicBezierEaseInOut:c},self:{separatorColor:u,itemTextColor:s,itemTextColorHover:m,itemTextColorPressed:k,itemTextColorActive:f,fontSize:n,fontWeightActive:v,itemBorderRadius:h,itemColorHover:p,itemColorPressed:C,itemLineHeight:T}}=l.value;return{"--n-font-size":n,"--n-bezier":c,"--n-item-text-color":s,"--n-item-text-color-hover":m,"--n-item-text-color-pressed":k,"--n-item-text-color-active":f,"--n-separator-color":u,"--n-item-color-hover":p,"--n-item-color-pressed":C,"--n-item-border-radius":h,"--n-font-weight-active":v,"--n-item-line-height":T}}),r=o?me("breadcrumb",void 0,i,e):void 0;return{mergedClsPrefix:t,cssVars:o?void 0:i,themeClass:r==null?void 0:r.themeClass,onRender:r==null?void 0:r.onRender}},render(){var e;return(e=this.onRender)===null||e===void 0||e.call(this),_("nav",{class:[`${this.mergedClsPrefix}-breadcrumb`,this.themeClass],style:this.cssVars,"aria-label":"Breadcrumb"},_("ul",null,this.$slots))}}),gt=(e=Bo?window:null)=>{const t=()=>{const{hash:i,host:r,hostname:c,href:u,origin:s,pathname:m,port:k,protocol:f,search:n}=(e==null?void 0:e.location)||{};return{hash:i,host:r,hostname:c,href:u,origin:s,pathname:m,port:k,protocol:f,search:n}},o=()=>{l.value=t()},l=E(t());return Ye(()=>{e&&(e.addEventListener("popstate",o),e.addEventListener("hashchange",o))}),No(()=>{e&&(e.removeEventListener("popstate",o),e.removeEventListener("hashchange",o))}),l},bt={separator:String,href:String,clickable:{type:Boolean,default:!0},onClick:Function},_t=U({name:"BreadcrumbItem",props:bt,setup(e,{slots:t}){const o=Y(ao,null);if(!o)return()=>null;const{separatorRef:l,mergedClsPrefixRef:i}=o,r=gt(),c=S(()=>e.href?"a":"span"),u=S(()=>r.value.href===e.href?"location":null);return()=>{const{value:s}=i;return _("li",{class:[`${s}-breadcrumb-item`,e.clickable&&`${s}-breadcrumb-item--clickable`]},_(c.value,{class:`${s}-breadcrumb-item__link`,"aria-current":u.value,href:e.href,onClick:e.onClick},t),_("span",{class:`${s}-breadcrumb-item__separator`,"aria-hidden":"true"},Mo(t.separator,()=>{var m;return[(m=e.separator)!==null&&m!==void 0?m:l.value]})))}}}),xt=e=>{const{baseColor:t,textColor2:o,bodyColor:l,cardColor:i,dividerColor:r,actionColor:c,scrollbarColor:u,scrollbarColorHover:s,invertedColor:m}=e;return{textColor:o,textColorInverted:"#FFF",color:l,colorEmbedded:c,headerColor:i,headerColorInverted:m,footerColor:c,footerColorInverted:m,headerBorderColor:r,headerBorderColorInverted:m,footerBorderColor:r,footerBorderColorInverted:m,siderBorderColor:r,siderBorderColorInverted:m,siderColor:i,siderColorInverted:m,siderToggleButtonBorder:`1px solid ${r}`,siderToggleButtonColor:t,siderToggleButtonIconColor:o,siderToggleButtonIconColorInverted:o,siderToggleBarColor:Ke(l,u),siderToggleBarColorHover:Ke(l,s),__invertScrollbar:"true"}},Ct=Ho({name:"Layout",common:Lo,peers:{Scrollbar:Eo},self:xt}),co=Ct,so=te("n-layout-sider"),uo={type:String,default:"static"},yt=b("layout",`
 color: var(--n-text-color);
 background-color: var(--n-color);
 box-sizing: border-box;
 position: relative;
 z-index: auto;
 flex: auto;
 overflow: hidden;
 transition:
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
`,[b("layout-scroll-container",`
 overflow-x: hidden;
 box-sizing: border-box;
 height: 100%;
 `),A("absolute-positioned",`
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `)]),wt={embedded:Boolean,position:uo,nativeScrollbar:{type:Boolean,default:!0},scrollbarProps:Object,onScroll:Function,contentClass:String,contentStyle:{type:[String,Object],default:""},hasSider:Boolean,siderPlacement:{type:String,default:"left"}},ho=te("n-layout");function zt(e){return U({name:e?"LayoutContent":"Layout",props:Object.assign(Object.assign({},Z.props),wt),setup(t){const o=E(null),l=E(null),{mergedClsPrefixRef:i,inlineThemeDisabled:r}=he(t),c=Z("Layout","-layout",yt,co,t,i);function u(p,C){if(t.nativeScrollbar){const{value:T}=o;T&&(C===void 0?T.scrollTo(p):T.scrollTo(p,C))}else{const{value:T}=l;T&&T.scrollTo(p,C)}}J(ho,t);let s=0,m=0;const k=p=>{var C;const T=p.target;s=T.scrollLeft,m=T.scrollTop,(C=t.onScroll)===null||C===void 0||C.call(t,p)};Xe(()=>{if(t.nativeScrollbar){const p=o.value;p&&(p.scrollTop=m,p.scrollLeft=s)}});const f={display:"flex",flexWrap:"nowrap",width:"100%",flexDirection:"row"},n={scrollTo:u},v=S(()=>{const{common:{cubicBezierEaseInOut:p},self:C}=c.value;return{"--n-bezier":p,"--n-color":t.embedded?C.colorEmbedded:C.color,"--n-text-color":C.textColor}}),h=r?me("layout",S(()=>t.embedded?"e":""),v,t):void 0;return Object.assign({mergedClsPrefix:i,scrollableElRef:o,scrollbarInstRef:l,hasSiderStyle:f,mergedTheme:c,handleNativeElScroll:k,cssVars:r?void 0:v,themeClass:h==null?void 0:h.themeClass,onRender:h==null?void 0:h.onRender},n)},render(){var t;const{mergedClsPrefix:o,hasSider:l}=this;(t=this.onRender)===null||t===void 0||t.call(this);const i=l?this.hasSiderStyle:void 0,r=[this.themeClass,e&&`${o}-layout-content`,`${o}-layout`,`${o}-layout--${this.position}-positioned`];return _("div",{class:r,style:this.cssVars},this.nativeScrollbar?_("div",{ref:"scrollableElRef",class:[`${o}-layout-scroll-container`,this.contentClass],style:[this.contentStyle,i],onScroll:this.handleNativeElScroll},this.$slots):_(Ze,Object.assign({},this.scrollbarProps,{onScroll:this.onScroll,ref:"scrollbarInstRef",theme:this.mergedTheme.peers.Scrollbar,themeOverrides:this.mergedTheme.peerOverrides.Scrollbar,contentClass:this.contentClass,contentStyle:[this.contentStyle,i]}),this.$slots))}})}const St=zt(!1),It=b("layout-sider",`
 flex-shrink: 0;
 box-sizing: border-box;
 position: relative;
 z-index: 1;
 color: var(--n-text-color);
 transition:
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 min-width .3s var(--n-bezier),
 max-width .3s var(--n-bezier),
 transform .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 background-color: var(--n-color);
 display: flex;
 justify-content: flex-end;
`,[A("bordered",[g("border",`
 content: "";
 position: absolute;
 top: 0;
 bottom: 0;
 width: 1px;
 background-color: var(--n-border-color);
 transition: background-color .3s var(--n-bezier);
 `)]),g("left-placement",[A("bordered",[g("border",`
 right: 0;
 `)])]),A("right-placement",`
 justify-content: flex-start;
 `,[A("bordered",[g("border",`
 left: 0;
 `)]),A("collapsed",[b("layout-toggle-button",[b("base-icon",`
 transform: rotate(180deg);
 `)]),b("layout-toggle-bar",[z("&:hover",[g("top",{transform:"rotate(-12deg) scale(1.15) translateY(-2px)"}),g("bottom",{transform:"rotate(12deg) scale(1.15) translateY(2px)"})])])]),b("layout-toggle-button",`
 left: 0;
 transform: translateX(-50%) translateY(-50%);
 `,[b("base-icon",`
 transform: rotate(0);
 `)]),b("layout-toggle-bar",`
 left: -28px;
 transform: rotate(180deg);
 `,[z("&:hover",[g("top",{transform:"rotate(12deg) scale(1.15) translateY(-2px)"}),g("bottom",{transform:"rotate(-12deg) scale(1.15) translateY(2px)"})])])]),A("collapsed",[b("layout-toggle-bar",[z("&:hover",[g("top",{transform:"rotate(-12deg) scale(1.15) translateY(-2px)"}),g("bottom",{transform:"rotate(12deg) scale(1.15) translateY(2px)"})])]),b("layout-toggle-button",[b("base-icon",`
 transform: rotate(0);
 `)])]),b("layout-toggle-button",`
 transition:
 color .3s var(--n-bezier),
 right .3s var(--n-bezier),
 left .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 cursor: pointer;
 width: 24px;
 height: 24px;
 position: absolute;
 top: 50%;
 right: 0;
 border-radius: 50%;
 display: flex;
 align-items: center;
 justify-content: center;
 font-size: 18px;
 color: var(--n-toggle-button-icon-color);
 border: var(--n-toggle-button-border);
 background-color: var(--n-toggle-button-color);
 box-shadow: 0 2px 4px 0px rgba(0, 0, 0, .06);
 transform: translateX(50%) translateY(-50%);
 z-index: 1;
 `,[b("base-icon",`
 transition: transform .3s var(--n-bezier);
 transform: rotate(180deg);
 `)]),b("layout-toggle-bar",`
 cursor: pointer;
 height: 72px;
 width: 32px;
 position: absolute;
 top: calc(50% - 36px);
 right: -28px;
 `,[g("top, bottom",`
 position: absolute;
 width: 4px;
 border-radius: 2px;
 height: 38px;
 left: 14px;
 transition: 
 background-color .3s var(--n-bezier),
 transform .3s var(--n-bezier);
 `),g("bottom",`
 position: absolute;
 top: 34px;
 `),z("&:hover",[g("top",{transform:"rotate(12deg) scale(1.15) translateY(-2px)"}),g("bottom",{transform:"rotate(-12deg) scale(1.15) translateY(2px)"})]),g("top, bottom",{backgroundColor:"var(--n-toggle-bar-color)"}),z("&:hover",[g("top, bottom",{backgroundColor:"var(--n-toggle-bar-color-hover)"})])]),g("border",`
 position: absolute;
 top: 0;
 right: 0;
 bottom: 0;
 width: 1px;
 transition: background-color .3s var(--n-bezier);
 `),b("layout-sider-scroll-container",`
 flex-grow: 1;
 flex-shrink: 0;
 box-sizing: border-box;
 height: 100%;
 opacity: 0;
 transition: opacity .3s var(--n-bezier);
 max-width: 100%;
 `),A("show-content",[b("layout-sider-scroll-container",{opacity:1})]),A("absolute-positioned",`
 position: absolute;
 left: 0;
 top: 0;
 bottom: 0;
 `)]),kt=U({name:"LayoutToggleButton",props:{clsPrefix:{type:String,required:!0},onClick:Function},render(){const{clsPrefix:e}=this;return _("div",{class:`${e}-layout-toggle-button`,onClick:this.onClick},_(Je,{clsPrefix:e},{default:()=>_(lt,null)}))}}),Rt=U({props:{clsPrefix:{type:String,required:!0},onClick:Function},render(){const{clsPrefix:e}=this;return _("div",{onClick:this.onClick,class:`${e}-layout-toggle-bar`},_("div",{class:`${e}-layout-toggle-bar__top`}),_("div",{class:`${e}-layout-toggle-bar__bottom`}))}}),$t={position:uo,bordered:Boolean,collapsedWidth:{type:Number,default:48},width:{type:[Number,String],default:272},contentClass:String,contentStyle:{type:[String,Object],default:""},collapseMode:{type:String,default:"transform"},collapsed:{type:Boolean,default:void 0},defaultCollapsed:Boolean,showCollapsedContent:{type:Boolean,default:!0},showTrigger:{type:[Boolean,String],default:!1},nativeScrollbar:{type:Boolean,default:!0},inverted:Boolean,scrollbarProps:Object,triggerClass:String,triggerStyle:[String,Object],collapsedTriggerClass:String,collapsedTriggerStyle:[String,Object],"onUpdate:collapsed":[Function,Array],onUpdateCollapsed:[Function,Array],onAfterEnter:Function,onAfterLeave:Function,onExpand:[Function,Array],onCollapse:[Function,Array],onScroll:Function},Pt=U({name:"LayoutSider",props:Object.assign(Object.assign({},Z.props),$t),setup(e){const t=Y(ho),o=E(null),l=E(null),i=S(()=>xe(s.value?e.collapsedWidth:e.width)),r=S(()=>e.collapseMode!=="transform"?{}:{minWidth:xe(e.width)}),c=S(()=>t?t.siderPlacement:"left"),u=E(e.defaultCollapsed),s=ke(ie(e,"collapsed"),u);function m(N,$){if(e.nativeScrollbar){const{value:P}=o;P&&($===void 0?P.scrollTo(N):P.scrollTo(N,$))}else{const{value:P}=l;P&&P.scrollTo(N,$)}}function k(){const{"onUpdate:collapsed":N,onUpdateCollapsed:$,onExpand:P,onCollapse:X}=e,{value:G}=s;$&&W($,!G),N&&W(N,!G),u.value=!G,G?P&&W(P):X&&W(X)}let f=0,n=0;const v=N=>{var $;const P=N.target;f=P.scrollLeft,n=P.scrollTop,($=e.onScroll)===null||$===void 0||$.call(e,N)};Xe(()=>{if(e.nativeScrollbar){const N=o.value;N&&(N.scrollTop=n,N.scrollLeft=f)}}),J(so,{collapsedRef:s,collapseModeRef:ie(e,"collapseMode")});const{mergedClsPrefixRef:h,inlineThemeDisabled:p}=he(e),C=Z("Layout","-layout-sider",It,co,e,h);function T(N){var $,P;N.propertyName==="max-width"&&(s.value?($=e.onAfterLeave)===null||$===void 0||$.call(e):(P=e.onAfterEnter)===null||P===void 0||P.call(e))}const H={scrollTo:m},K=S(()=>{const{common:{cubicBezierEaseInOut:N},self:$}=C.value,{siderToggleButtonColor:P,siderToggleButtonBorder:X,siderToggleBarColor:G,siderToggleBarColorHover:ge}=$,D={"--n-bezier":N,"--n-toggle-button-color":P,"--n-toggle-button-border":X,"--n-toggle-bar-color":G,"--n-toggle-bar-color-hover":ge};return e.inverted?(D["--n-color"]=$.siderColorInverted,D["--n-text-color"]=$.textColorInverted,D["--n-border-color"]=$.siderBorderColorInverted,D["--n-toggle-button-icon-color"]=$.siderToggleButtonIconColorInverted,D.__invertScrollbar=$.__invertScrollbar):(D["--n-color"]=$.siderColor,D["--n-text-color"]=$.textColor,D["--n-border-color"]=$.siderBorderColor,D["--n-toggle-button-icon-color"]=$.siderToggleButtonIconColor),D}),F=p?me("layout-sider",S(()=>e.inverted?"a":"b"),K,e):void 0;return Object.assign({scrollableElRef:o,scrollbarInstRef:l,mergedClsPrefix:h,mergedTheme:C,styleMaxWidth:i,mergedCollapsed:s,scrollContainerStyle:r,siderPlacement:c,handleNativeElScroll:v,handleTransitionend:T,handleTriggerClick:k,inlineThemeDisabled:p,cssVars:K,themeClass:F==null?void 0:F.themeClass,onRender:F==null?void 0:F.onRender},H)},render(){var e;const{mergedClsPrefix:t,mergedCollapsed:o,showTrigger:l}=this;return(e=this.onRender)===null||e===void 0||e.call(this),_("aside",{class:[`${t}-layout-sider`,this.themeClass,`${t}-layout-sider--${this.position}-positioned`,`${t}-layout-sider--${this.siderPlacement}-placement`,this.bordered&&`${t}-layout-sider--bordered`,o&&`${t}-layout-sider--collapsed`,(!o||this.showCollapsedContent)&&`${t}-layout-sider--show-content`],onTransitionend:this.handleTransitionend,style:[this.inlineThemeDisabled?void 0:this.cssVars,{maxWidth:this.styleMaxWidth,width:xe(this.width)}]},this.nativeScrollbar?_("div",{class:[`${t}-layout-sider-scroll-container`,this.contentClass],onScroll:this.handleNativeElScroll,style:[this.scrollContainerStyle,{overflow:"auto"},this.contentStyle],ref:"scrollableElRef"},this.$slots):_(Ze,Object.assign({},this.scrollbarProps,{onScroll:this.onScroll,ref:"scrollbarInstRef",style:this.scrollContainerStyle,contentStyle:this.contentStyle,contentClass:this.contentClass,theme:this.mergedTheme.peers.Scrollbar,themeOverrides:this.mergedTheme.peerOverrides.Scrollbar,builtinThemeOverrides:this.inverted&&this.cssVars.__invertScrollbar==="true"?{colorHover:"rgba(255, 255, 255, .4)",color:"rgba(255, 255, 255, .3)"}:void 0}),this.$slots),l?l==="bar"?_(Rt,{clsPrefix:t,class:o?this.collapsedTriggerClass:this.triggerClass,style:o?this.collapsedTriggerStyle:this.triggerStyle,onClick:this.handleTriggerClick}):_(kt,{clsPrefix:t,class:o?this.collapsedTriggerClass:this.triggerClass,style:o?this.collapsedTriggerStyle:this.triggerStyle,onClick:this.handleTriggerClick}):null,this.bordered?_("div",{class:`${t}-layout-sider__border`}):null)}}),ce=te("n-menu"),Ae=te("n-submenu"),Ne=te("n-menu-item-group"),ue=8;function Be(e){const t=Y(ce),{props:o,mergedCollapsedRef:l}=t,i=Y(Ae,null),r=Y(Ne,null),c=S(()=>o.mode==="horizontal"),u=S(()=>c.value?o.dropdownPlacement:"tmNodes"in e?"right-start":"right"),s=S(()=>{var n;return Math.max((n=o.collapsedIconSize)!==null&&n!==void 0?n:o.iconSize,o.iconSize)}),m=S(()=>{var n;return!c.value&&e.root&&l.value&&(n=o.collapsedIconSize)!==null&&n!==void 0?n:o.iconSize}),k=S(()=>{if(c.value||c.value)return;const{collapsedWidth:n,indent:v,rootIndent:h}=o,{root:p,isGroup:C}=e,T=h===void 0?v:h;return p?l.value?n/2-s.value/2:T:r&&typeof r.paddingLeftRef.value=="number"?v/2+r.paddingLeftRef.value:i&&typeof i.paddingLeftRef.value=="number"?(C?v/2:v)+i.paddingLeftRef.value:0}),f=S(()=>{const{collapsedWidth:n,indent:v,rootIndent:h}=o,{value:p}=s,{root:C}=e;return c.value||!C||!l.value?ue:(h===void 0?v:h)+p+ue-(n+p)/2});return{dropdownPlacement:u,activeIconSize:m,maxIconSize:s,paddingLeft:k,iconMarginRight:f,NMenu:t,NSubmenu:i}}const Me={internalKey:{type:[String,Number],required:!0},root:Boolean,isGroup:Boolean,level:{type:Number,required:!0},title:[String,Function],extra:[String,Function]},mo=Object.assign(Object.assign({},Me),{tmNode:{type:Object,required:!0},tmNodes:{type:Array,required:!0}}),Tt=U({name:"MenuOptionGroup",props:mo,setup(e){J(Ae,null);const t=Be(e);J(Ne,{paddingLeftRef:t.paddingLeft});const{mergedClsPrefixRef:o,props:l}=Y(ce);return function(){const{value:i}=o,r=t.paddingLeft.value,{nodeProps:c}=l,u=c==null?void 0:c(e.tmNode.rawNode);return _("div",{class:`${i}-menu-item-group`,role:"group"},_("div",Object.assign({},u,{class:[`${i}-menu-item-group-title`,u==null?void 0:u.class],style:[(u==null?void 0:u.style)||"",r!==void 0?`padding-left: ${r}px;`:""]}),oe(e.title),e.extra?_(ne,null," ",oe(e.extra)):null),_("div",null,e.tmNodes.map(s=>He(s,l))))}}}),vo=U({name:"MenuOptionContent",props:{collapsed:Boolean,disabled:Boolean,title:[String,Function],icon:Function,extra:[String,Function],showArrow:Boolean,childActive:Boolean,hover:Boolean,paddingLeft:Number,selected:Boolean,maxIconSize:{type:Number,required:!0},activeIconSize:{type:Number,required:!0},iconMarginRight:{type:Number,required:!0},clsPrefix:{type:String,required:!0},onClick:Function,tmNode:{type:Object,required:!0},isEllipsisPlaceholder:Boolean},setup(e){const{props:t}=Y(ce);return{menuProps:t,style:S(()=>{const{paddingLeft:o}=e;return{paddingLeft:o&&`${o}px`}}),iconStyle:S(()=>{const{maxIconSize:o,activeIconSize:l,iconMarginRight:i}=e;return{width:`${o}px`,height:`${o}px`,fontSize:`${l}px`,marginRight:`${i}px`}})}},render(){const{clsPrefix:e,tmNode:t,menuProps:{renderIcon:o,renderLabel:l,renderExtra:i,expandIcon:r}}=this,c=o?o(t.rawNode):oe(this.icon);return _("div",{onClick:u=>{var s;(s=this.onClick)===null||s===void 0||s.call(this,u)},role:"none",class:[`${e}-menu-item-content`,{[`${e}-menu-item-content--selected`]:this.selected,[`${e}-menu-item-content--collapsed`]:this.collapsed,[`${e}-menu-item-content--child-active`]:this.childActive,[`${e}-menu-item-content--disabled`]:this.disabled,[`${e}-menu-item-content--hover`]:this.hover}],style:this.style},c&&_("div",{class:`${e}-menu-item-content__icon`,style:this.iconStyle,role:"none"},[c]),_("div",{class:`${e}-menu-item-content-header`,role:"none"},this.isEllipsisPlaceholder?this.title:l?l(t.rawNode):oe(this.title),this.extra||i?_("span",{class:`${e}-menu-item-content-header__extra`}," ",i?i(t.rawNode):oe(this.extra)):null),this.showArrow?_(Je,{ariaHidden:!0,class:`${e}-menu-item-content__arrow`,clsPrefix:e},{default:()=>r?r(t.rawNode):_(mt,null)}):null)}}),po=Object.assign(Object.assign({},Me),{rawNodes:{type:Array,default:()=>[]},tmNodes:{type:Array,default:()=>[]},tmNode:{type:Object,required:!0},disabled:Boolean,icon:Function,onClick:Function,domId:String,virtualChildActive:{type:Boolean,default:void 0},isEllipsisPlaceholder:Boolean}),Re=U({name:"Submenu",props:po,setup(e){const t=Be(e),{NMenu:o,NSubmenu:l}=t,{props:i,mergedCollapsedRef:r,mergedThemeRef:c}=o,u=S(()=>{const{disabled:n}=e;return l!=null&&l.mergedDisabledRef.value||i.disabled?!0:n}),s=E(!1);J(Ae,{paddingLeftRef:t.paddingLeft,mergedDisabledRef:u}),J(Ne,null);function m(){const{onClick:n}=e;n&&n()}function k(){u.value||(r.value||o.toggleExpand(e.internalKey),m())}function f(n){s.value=n}return{menuProps:i,mergedTheme:c,doSelect:o.doSelect,inverted:o.invertedRef,isHorizontal:o.isHorizontalRef,mergedClsPrefix:o.mergedClsPrefixRef,maxIconSize:t.maxIconSize,activeIconSize:t.activeIconSize,iconMarginRight:t.iconMarginRight,dropdownPlacement:t.dropdownPlacement,dropdownShow:s,paddingLeft:t.paddingLeft,mergedDisabled:u,mergedValue:o.mergedValueRef,childActive:Ce(()=>{var n;return(n=e.virtualChildActive)!==null&&n!==void 0?n:o.activePathRef.value.includes(e.internalKey)}),collapsed:S(()=>i.mode==="horizontal"?!1:r.value?!0:!o.mergedExpandedKeysRef.value.includes(e.internalKey)),dropdownEnabled:S(()=>!u.value&&(i.mode==="horizontal"||r.value)),handlePopoverShowChange:f,handleClick:k}},render(){var e;const{mergedClsPrefix:t,menuProps:{renderIcon:o,renderLabel:l}}=this,i=()=>{const{isHorizontal:c,paddingLeft:u,collapsed:s,mergedDisabled:m,maxIconSize:k,activeIconSize:f,title:n,childActive:v,icon:h,handleClick:p,menuProps:{nodeProps:C},dropdownShow:T,iconMarginRight:H,tmNode:K,mergedClsPrefix:F,isEllipsisPlaceholder:N,extra:$}=this,P=C==null?void 0:C(K.rawNode);return _("div",Object.assign({},P,{class:[`${F}-menu-item`,P==null?void 0:P.class],role:"menuitem"}),_(vo,{tmNode:K,paddingLeft:u,collapsed:s,disabled:m,iconMarginRight:H,maxIconSize:k,activeIconSize:f,title:n,extra:$,showArrow:!c,childActive:v,clsPrefix:F,icon:h,hover:T,onClick:p,isEllipsisPlaceholder:N}))},r=()=>_(Oo,null,{default:()=>{const{tmNodes:c,collapsed:u}=this;return u?null:_("div",{class:`${t}-submenu-children`,role:"menu"},c.map(s=>He(s,this.menuProps)))}});return this.root?_(Te,Object.assign({size:"large",trigger:"hover"},(e=this.menuProps)===null||e===void 0?void 0:e.dropdownProps,{themeOverrides:this.mergedTheme.peerOverrides.Dropdown,theme:this.mergedTheme.peers.Dropdown,builtinThemeOverrides:{fontSizeLarge:"14px",optionIconSizeLarge:"18px"},value:this.mergedValue,disabled:!this.dropdownEnabled,placement:this.dropdownPlacement,keyField:this.menuProps.keyField,labelField:this.menuProps.labelField,childrenField:this.menuProps.childrenField,onUpdateShow:this.handlePopoverShowChange,options:this.rawNodes,onSelect:this.doSelect,inverted:this.inverted,renderIcon:o,renderLabel:l}),{default:()=>_("div",{class:`${t}-submenu`,role:"menuitem","aria-expanded":!this.collapsed,id:this.domId},i(),this.isHorizontal?null:r())}):_("div",{class:`${t}-submenu`,role:"menuitem","aria-expanded":!this.collapsed,id:this.domId},i(),r())}}),fo=Object.assign(Object.assign({},Me),{tmNode:{type:Object,required:!0},disabled:Boolean,icon:Function,onClick:Function}),At=U({name:"MenuOption",props:fo,setup(e){const t=Be(e),{NSubmenu:o,NMenu:l}=t,{props:i,mergedClsPrefixRef:r,mergedCollapsedRef:c}=l,u=o?o.mergedDisabledRef:{value:!1},s=S(()=>u.value||e.disabled);function m(f){const{onClick:n}=e;n&&n(f)}function k(f){s.value||(l.doSelect(e.internalKey,e.tmNode.rawNode),m(f))}return{mergedClsPrefix:r,dropdownPlacement:t.dropdownPlacement,paddingLeft:t.paddingLeft,iconMarginRight:t.iconMarginRight,maxIconSize:t.maxIconSize,activeIconSize:t.activeIconSize,mergedTheme:l.mergedThemeRef,menuProps:i,dropdownEnabled:Ce(()=>e.root&&c.value&&i.mode!=="horizontal"&&!s.value),selected:Ce(()=>l.mergedValueRef.value===e.internalKey),mergedDisabled:s,handleClick:k}},render(){const{mergedClsPrefix:e,mergedTheme:t,tmNode:o,menuProps:{renderLabel:l,nodeProps:i}}=this,r=i==null?void 0:i(o.rawNode);return _("div",Object.assign({},r,{role:"menuitem",class:[`${e}-menu-item`,r==null?void 0:r.class]}),_(ct,{theme:t.peers.Tooltip,themeOverrides:t.peerOverrides.Tooltip,trigger:"hover",placement:this.dropdownPlacement,disabled:!this.dropdownEnabled||this.title===void 0,internalExtraClass:["menu-tooltip"]},{default:()=>l?l(o.rawNode):oe(this.title),trigger:()=>_(vo,{tmNode:o,clsPrefix:e,paddingLeft:this.paddingLeft,iconMarginRight:this.iconMarginRight,maxIconSize:this.maxIconSize,activeIconSize:this.activeIconSize,selected:this.selected,title:this.title,extra:this.extra,disabled:this.mergedDisabled,icon:this.icon,onClick:this.handleClick})}))}}),Nt=U({name:"MenuDivider",setup(){const e=Y(ce),{mergedClsPrefixRef:t,isHorizontalRef:o}=e;return()=>o.value?null:_("div",{class:`${t.value}-menu-divider`})}}),Bt=Pe(mo),Mt=Pe(fo),Ht=Pe(po);function $e(e){return e.type==="divider"||e.type==="render"}function Lt(e){return e.type==="divider"}function He(e,t){const{rawNode:o}=e,{show:l}=o;if(l===!1)return null;if($e(o))return Lt(o)?_(Nt,Object.assign({key:e.key},o.props)):null;const{labelField:i}=t,{key:r,level:c,isGroup:u}=e,s=Object.assign(Object.assign({},o),{title:o.title||o[i],extra:o.titleExtra||o.extra,key:r,internalKey:r,level:c,root:c===0,isGroup:u});return e.children?e.isGroup?_(Tt,be(s,Bt,{tmNode:e,tmNodes:e.children,key:r})):_(Re,be(s,Ht,{key:r,rawNodes:o[t.childrenField],tmNodes:e.children,tmNode:e})):_(At,be(s,Mt,{key:r,tmNode:e}))}const Ge=[z("&::before","background-color: var(--n-item-color-hover);"),g("arrow",`
 color: var(--n-arrow-color-hover);
 `),g("icon",`
 color: var(--n-item-icon-color-hover);
 `),b("menu-item-content-header",`
 color: var(--n-item-text-color-hover);
 `,[z("a",`
 color: var(--n-item-text-color-hover);
 `),g("extra",`
 color: var(--n-item-text-color-hover);
 `)])],qe=[g("icon",`
 color: var(--n-item-icon-color-hover-horizontal);
 `),b("menu-item-content-header",`
 color: var(--n-item-text-color-hover-horizontal);
 `,[z("a",`
 color: var(--n-item-text-color-hover-horizontal);
 `),g("extra",`
 color: var(--n-item-text-color-hover-horizontal);
 `)])],Et=z([b("menu",`
 background-color: var(--n-color);
 color: var(--n-item-text-color);
 overflow: hidden;
 transition: background-color .3s var(--n-bezier);
 box-sizing: border-box;
 font-size: var(--n-font-size);
 padding-bottom: 6px;
 `,[A("horizontal",`
 max-width: 100%;
 width: 100%;
 display: flex;
 overflow: hidden;
 padding-bottom: 0;
 `,[b("submenu","margin: 0;"),b("menu-item","margin: 0;"),b("menu-item-content",`
 padding: 0 20px;
 border-bottom: 2px solid #0000;
 `,[z("&::before","display: none;"),A("selected","border-bottom: 2px solid var(--n-border-color-horizontal)")]),b("menu-item-content",[A("selected",[g("icon","color: var(--n-item-icon-color-active-horizontal);"),b("menu-item-content-header",`
 color: var(--n-item-text-color-active-horizontal);
 `,[z("a","color: var(--n-item-text-color-active-horizontal);"),g("extra","color: var(--n-item-text-color-active-horizontal);")])]),A("child-active",`
 border-bottom: 2px solid var(--n-border-color-horizontal);
 `,[b("menu-item-content-header",`
 color: var(--n-item-text-color-child-active-horizontal);
 `,[z("a",`
 color: var(--n-item-text-color-child-active-horizontal);
 `),g("extra",`
 color: var(--n-item-text-color-child-active-horizontal);
 `)]),g("icon",`
 color: var(--n-item-icon-color-child-active-horizontal);
 `)]),re("disabled",[re("selected, child-active",[z("&:focus-within",qe)]),A("selected",[Q(null,[g("icon","color: var(--n-item-icon-color-active-hover-horizontal);"),b("menu-item-content-header",`
 color: var(--n-item-text-color-active-hover-horizontal);
 `,[z("a","color: var(--n-item-text-color-active-hover-horizontal);"),g("extra","color: var(--n-item-text-color-active-hover-horizontal);")])])]),A("child-active",[Q(null,[g("icon","color: var(--n-item-icon-color-child-active-hover-horizontal);"),b("menu-item-content-header",`
 color: var(--n-item-text-color-child-active-hover-horizontal);
 `,[z("a","color: var(--n-item-text-color-child-active-hover-horizontal);"),g("extra","color: var(--n-item-text-color-child-active-hover-horizontal);")])])]),Q("border-bottom: 2px solid var(--n-border-color-horizontal);",qe)]),b("menu-item-content-header",[z("a","color: var(--n-item-text-color-horizontal);")])])]),re("responsive",[b("menu-item-content-header",`
 overflow: hidden;
 text-overflow: ellipsis;
 `)]),A("collapsed",[b("menu-item-content",[A("selected",[z("&::before",`
 background-color: var(--n-item-color-active-collapsed) !important;
 `)]),b("menu-item-content-header","opacity: 0;"),g("arrow","opacity: 0;"),g("icon","color: var(--n-item-icon-color-collapsed);")])]),b("menu-item",`
 height: var(--n-item-height);
 margin-top: 6px;
 position: relative;
 `),b("menu-item-content",`
 box-sizing: border-box;
 line-height: 1.75;
 height: 100%;
 display: grid;
 grid-template-areas: "icon content arrow";
 grid-template-columns: auto 1fr auto;
 align-items: center;
 cursor: pointer;
 position: relative;
 padding-right: 18px;
 transition:
 background-color .3s var(--n-bezier),
 padding-left .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[z("> *","z-index: 1;"),z("&::before",`
 z-index: auto;
 content: "";
 background-color: #0000;
 position: absolute;
 left: 8px;
 right: 8px;
 top: 0;
 bottom: 0;
 pointer-events: none;
 border-radius: var(--n-border-radius);
 transition: background-color .3s var(--n-bezier);
 `),A("disabled",`
 opacity: .45;
 cursor: not-allowed;
 `),A("collapsed",[g("arrow","transform: rotate(0);")]),A("selected",[z("&::before","background-color: var(--n-item-color-active);"),g("arrow","color: var(--n-arrow-color-active);"),g("icon","color: var(--n-item-icon-color-active);"),b("menu-item-content-header",`
 color: var(--n-item-text-color-active);
 `,[z("a","color: var(--n-item-text-color-active);"),g("extra","color: var(--n-item-text-color-active);")])]),A("child-active",[b("menu-item-content-header",`
 color: var(--n-item-text-color-child-active);
 `,[z("a",`
 color: var(--n-item-text-color-child-active);
 `),g("extra",`
 color: var(--n-item-text-color-child-active);
 `)]),g("arrow",`
 color: var(--n-arrow-color-child-active);
 `),g("icon",`
 color: var(--n-item-icon-color-child-active);
 `)]),re("disabled",[re("selected, child-active",[z("&:focus-within",Ge)]),A("selected",[Q(null,[g("arrow","color: var(--n-arrow-color-active-hover);"),g("icon","color: var(--n-item-icon-color-active-hover);"),b("menu-item-content-header",`
 color: var(--n-item-text-color-active-hover);
 `,[z("a","color: var(--n-item-text-color-active-hover);"),g("extra","color: var(--n-item-text-color-active-hover);")])])]),A("child-active",[Q(null,[g("arrow","color: var(--n-arrow-color-child-active-hover);"),g("icon","color: var(--n-item-icon-color-child-active-hover);"),b("menu-item-content-header",`
 color: var(--n-item-text-color-child-active-hover);
 `,[z("a","color: var(--n-item-text-color-child-active-hover);"),g("extra","color: var(--n-item-text-color-child-active-hover);")])])]),A("selected",[Q(null,[z("&::before","background-color: var(--n-item-color-active-hover);")])]),Q(null,Ge)]),g("icon",`
 grid-area: icon;
 color: var(--n-item-icon-color);
 transition:
 color .3s var(--n-bezier),
 font-size .3s var(--n-bezier),
 margin-right .3s var(--n-bezier);
 box-sizing: content-box;
 display: inline-flex;
 align-items: center;
 justify-content: center;
 `),g("arrow",`
 grid-area: arrow;
 font-size: 16px;
 color: var(--n-arrow-color);
 transform: rotate(180deg);
 opacity: 1;
 transition:
 color .3s var(--n-bezier),
 transform 0.2s var(--n-bezier),
 opacity 0.2s var(--n-bezier);
 `),b("menu-item-content-header",`
 grid-area: content;
 transition:
 color .3s var(--n-bezier),
 opacity .3s var(--n-bezier);
 opacity: 1;
 white-space: nowrap;
 color: var(--n-item-text-color);
 `,[z("a",`
 outline: none;
 text-decoration: none;
 transition: color .3s var(--n-bezier);
 color: var(--n-item-text-color);
 `,[z("&::before",`
 content: "";
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `)]),g("extra",`
 font-size: .93em;
 color: var(--n-group-text-color);
 transition: color .3s var(--n-bezier);
 `)])]),b("submenu",`
 cursor: pointer;
 position: relative;
 margin-top: 6px;
 `,[b("menu-item-content",`
 height: var(--n-item-height);
 `),b("submenu-children",`
 overflow: hidden;
 padding: 0;
 `,[Fo({duration:".2s"})])]),b("menu-item-group",[b("menu-item-group-title",`
 margin-top: 6px;
 color: var(--n-group-text-color);
 cursor: default;
 font-size: .93em;
 height: 36px;
 display: flex;
 align-items: center;
 transition:
 padding-left .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `)])]),b("menu-tooltip",[z("a",`
 color: inherit;
 text-decoration: none;
 `)]),b("menu-divider",`
 transition: background-color .3s var(--n-bezier);
 background-color: var(--n-divider-color);
 height: 1px;
 margin: 6px 18px;
 `)]);function Q(e,t){return[A("hover",e,t),z("&:hover",e,t)]}const Ot=Object.assign(Object.assign({},Z.props),{options:{type:Array,default:()=>[]},collapsed:{type:Boolean,default:void 0},collapsedWidth:{type:Number,default:48},iconSize:{type:Number,default:20},collapsedIconSize:{type:Number,default:24},rootIndent:Number,indent:{type:Number,default:32},labelField:{type:String,default:"label"},keyField:{type:String,default:"key"},childrenField:{type:String,default:"children"},disabledField:{type:String,default:"disabled"},defaultExpandAll:Boolean,defaultExpandedKeys:Array,expandedKeys:Array,value:[String,Number],defaultValue:{type:[String,Number],default:null},mode:{type:String,default:"vertical"},watchProps:{type:Array,default:void 0},disabled:Boolean,show:{type:Boolean,default:!0},inverted:Boolean,"onUpdate:expandedKeys":[Function,Array],onUpdateExpandedKeys:[Function,Array],onUpdateValue:[Function,Array],"onUpdate:value":[Function,Array],expandIcon:Function,renderIcon:Function,renderLabel:Function,renderExtra:Function,dropdownProps:Object,accordion:Boolean,nodeProps:Function,dropdownPlacement:{type:String,default:"bottom"},responsive:Boolean,items:Array,onOpenNamesChange:[Function,Array],onSelect:[Function,Array],onExpandedNamesChange:[Function,Array],expandedNames:Array,defaultExpandedNames:Array}),Ft=U({name:"Menu",props:Ot,setup(e){const{mergedClsPrefixRef:t,inlineThemeDisabled:o}=he(e),l=Z("Menu","-menu",Et,jo,e,t),i=Y(so,null),r=S(()=>{var x;const{collapsed:R}=e;if(R!==void 0)return R;if(i){const{collapseModeRef:a,collapsedRef:w}=i;if(a.value==="width")return(x=w.value)!==null&&x!==void 0?x:!1}return!1}),c=S(()=>{const{keyField:x,childrenField:R,disabledField:a}=e;return _e(e.items||e.options,{getIgnored(w){return $e(w)},getChildren(w){return w[R]},getDisabled(w){return w[a]},getKey(w){var B;return(B=w[x])!==null&&B!==void 0?B:w.name}})}),u=S(()=>new Set(c.value.treeNodes.map(x=>x.key))),{watchProps:s}=e,m=E(null);s!=null&&s.includes("defaultValue")?ye(()=>{m.value=e.defaultValue}):m.value=e.defaultValue;const k=ie(e,"value"),f=ke(k,m),n=E([]),v=()=>{n.value=e.defaultExpandAll?c.value.getNonLeafKeys():e.defaultExpandedNames||e.defaultExpandedKeys||c.value.getPath(f.value,{includeSelf:!1}).keyPath};s!=null&&s.includes("defaultExpandedKeys")?ye(v):v();const h=ut(e,["expandedNames","expandedKeys"]),p=ke(h,n),C=S(()=>c.value.treeNodes),T=S(()=>c.value.getPath(f.value).keyPath);J(ce,{props:e,mergedCollapsedRef:r,mergedThemeRef:l,mergedValueRef:f,mergedExpandedKeysRef:p,activePathRef:T,mergedClsPrefixRef:t,isHorizontalRef:S(()=>e.mode==="horizontal"),invertedRef:ie(e,"inverted"),doSelect:H,toggleExpand:F});function H(x,R){const{"onUpdate:value":a,onUpdateValue:w,onSelect:B}=e;w&&W(w,x,R),a&&W(a,x,R),B&&W(B,x,R),m.value=x}function K(x){const{"onUpdate:expandedKeys":R,onUpdateExpandedKeys:a,onExpandedNamesChange:w,onOpenNamesChange:B}=e;R&&W(R,x),a&&W(a,x),w&&W(w,x),B&&W(B,x),n.value=x}function F(x){const R=Array.from(p.value),a=R.findIndex(w=>w===x);if(~a)R.splice(a,1);else{if(e.accordion&&u.value.has(x)){const w=R.findIndex(B=>u.value.has(B));w>-1&&R.splice(w,1)}R.push(x)}K(R)}const N=x=>{const R=c.value.getPath(x!=null?x:f.value,{includeSelf:!1}).keyPath;if(!R.length)return;const a=Array.from(p.value),w=new Set([...a,...R]);e.accordion&&u.value.forEach(B=>{w.has(B)&&!R.includes(B)&&w.delete(B)}),K(Array.from(w))},$=S(()=>{const{inverted:x}=e,{common:{cubicBezierEaseInOut:R},self:a}=l.value,{borderRadius:w,borderColorHorizontal:B,fontSize:zo,itemHeight:So,dividerColor:Io}=a,d={"--n-divider-color":Io,"--n-bezier":R,"--n-font-size":zo,"--n-border-color-horizontal":B,"--n-border-radius":w,"--n-item-height":So};return x?(d["--n-group-text-color"]=a.groupTextColorInverted,d["--n-color"]=a.colorInverted,d["--n-item-text-color"]=a.itemTextColorInverted,d["--n-item-text-color-hover"]=a.itemTextColorHoverInverted,d["--n-item-text-color-active"]=a.itemTextColorActiveInverted,d["--n-item-text-color-child-active"]=a.itemTextColorChildActiveInverted,d["--n-item-text-color-child-active-hover"]=a.itemTextColorChildActiveInverted,d["--n-item-text-color-active-hover"]=a.itemTextColorActiveHoverInverted,d["--n-item-icon-color"]=a.itemIconColorInverted,d["--n-item-icon-color-hover"]=a.itemIconColorHoverInverted,d["--n-item-icon-color-active"]=a.itemIconColorActiveInverted,d["--n-item-icon-color-active-hover"]=a.itemIconColorActiveHoverInverted,d["--n-item-icon-color-child-active"]=a.itemIconColorChildActiveInverted,d["--n-item-icon-color-child-active-hover"]=a.itemIconColorChildActiveHoverInverted,d["--n-item-icon-color-collapsed"]=a.itemIconColorCollapsedInverted,d["--n-item-text-color-horizontal"]=a.itemTextColorHorizontalInverted,d["--n-item-text-color-hover-horizontal"]=a.itemTextColorHoverHorizontalInverted,d["--n-item-text-color-active-horizontal"]=a.itemTextColorActiveHorizontalInverted,d["--n-item-text-color-child-active-horizontal"]=a.itemTextColorChildActiveHorizontalInverted,d["--n-item-text-color-child-active-hover-horizontal"]=a.itemTextColorChildActiveHoverHorizontalInverted,d["--n-item-text-color-active-hover-horizontal"]=a.itemTextColorActiveHoverHorizontalInverted,d["--n-item-icon-color-horizontal"]=a.itemIconColorHorizontalInverted,d["--n-item-icon-color-hover-horizontal"]=a.itemIconColorHoverHorizontalInverted,d["--n-item-icon-color-active-horizontal"]=a.itemIconColorActiveHorizontalInverted,d["--n-item-icon-color-active-hover-horizontal"]=a.itemIconColorActiveHoverHorizontalInverted,d["--n-item-icon-color-child-active-horizontal"]=a.itemIconColorChildActiveHorizontalInverted,d["--n-item-icon-color-child-active-hover-horizontal"]=a.itemIconColorChildActiveHoverHorizontalInverted,d["--n-arrow-color"]=a.arrowColorInverted,d["--n-arrow-color-hover"]=a.arrowColorHoverInverted,d["--n-arrow-color-active"]=a.arrowColorActiveInverted,d["--n-arrow-color-active-hover"]=a.arrowColorActiveHoverInverted,d["--n-arrow-color-child-active"]=a.arrowColorChildActiveInverted,d["--n-arrow-color-child-active-hover"]=a.arrowColorChildActiveHoverInverted,d["--n-item-color-hover"]=a.itemColorHoverInverted,d["--n-item-color-active"]=a.itemColorActiveInverted,d["--n-item-color-active-hover"]=a.itemColorActiveHoverInverted,d["--n-item-color-active-collapsed"]=a.itemColorActiveCollapsedInverted):(d["--n-group-text-color"]=a.groupTextColor,d["--n-color"]=a.color,d["--n-item-text-color"]=a.itemTextColor,d["--n-item-text-color-hover"]=a.itemTextColorHover,d["--n-item-text-color-active"]=a.itemTextColorActive,d["--n-item-text-color-child-active"]=a.itemTextColorChildActive,d["--n-item-text-color-child-active-hover"]=a.itemTextColorChildActiveHover,d["--n-item-text-color-active-hover"]=a.itemTextColorActiveHover,d["--n-item-icon-color"]=a.itemIconColor,d["--n-item-icon-color-hover"]=a.itemIconColorHover,d["--n-item-icon-color-active"]=a.itemIconColorActive,d["--n-item-icon-color-active-hover"]=a.itemIconColorActiveHover,d["--n-item-icon-color-child-active"]=a.itemIconColorChildActive,d["--n-item-icon-color-child-active-hover"]=a.itemIconColorChildActiveHover,d["--n-item-icon-color-collapsed"]=a.itemIconColorCollapsed,d["--n-item-text-color-horizontal"]=a.itemTextColorHorizontal,d["--n-item-text-color-hover-horizontal"]=a.itemTextColorHoverHorizontal,d["--n-item-text-color-active-horizontal"]=a.itemTextColorActiveHorizontal,d["--n-item-text-color-child-active-horizontal"]=a.itemTextColorChildActiveHorizontal,d["--n-item-text-color-child-active-hover-horizontal"]=a.itemTextColorChildActiveHoverHorizontal,d["--n-item-text-color-active-hover-horizontal"]=a.itemTextColorActiveHoverHorizontal,d["--n-item-icon-color-horizontal"]=a.itemIconColorHorizontal,d["--n-item-icon-color-hover-horizontal"]=a.itemIconColorHoverHorizontal,d["--n-item-icon-color-active-horizontal"]=a.itemIconColorActiveHorizontal,d["--n-item-icon-color-active-hover-horizontal"]=a.itemIconColorActiveHoverHorizontal,d["--n-item-icon-color-child-active-horizontal"]=a.itemIconColorChildActiveHorizontal,d["--n-item-icon-color-child-active-hover-horizontal"]=a.itemIconColorChildActiveHoverHorizontal,d["--n-arrow-color"]=a.arrowColor,d["--n-arrow-color-hover"]=a.arrowColorHover,d["--n-arrow-color-active"]=a.arrowColorActive,d["--n-arrow-color-active-hover"]=a.arrowColorActiveHover,d["--n-arrow-color-child-active"]=a.arrowColorChildActive,d["--n-arrow-color-child-active-hover"]=a.arrowColorChildActiveHover,d["--n-item-color-hover"]=a.itemColorHover,d["--n-item-color-active"]=a.itemColorActive,d["--n-item-color-active-hover"]=a.itemColorActiveHover,d["--n-item-color-active-collapsed"]=a.itemColorActiveCollapsed),d}),P=o?me("menu",S(()=>e.inverted?"a":"b"),$,e):void 0,X=Ko(),G=E(null),ge=E(null);let D=!0;const Le=()=>{var x;D?D=!1:(x=G.value)===null||x===void 0||x.sync({showAllItemsBeforeCalculate:!0})};function go(){return document.getElementById(X)}const se=E(-1);function bo(x){se.value=e.options.length-x}function _o(x){x||(se.value=-1)}const xo=S(()=>{const x=se.value;return{children:x===-1?[]:e.options.slice(x)}}),Co=S(()=>{const{childrenField:x,disabledField:R,keyField:a}=e;return _e([xo.value],{getIgnored(w){return $e(w)},getChildren(w){return w[x]},getDisabled(w){return w[R]},getKey(w){var B;return(B=w[a])!==null&&B!==void 0?B:w.name}})}),yo=S(()=>_e([{}]).treeNodes[0]);function wo(){var x;if(se.value===-1)return _(Re,{root:!0,level:0,key:"__ellpisisGroupPlaceholder__",internalKey:"__ellpisisGroupPlaceholder__",title:"···",tmNode:yo.value,domId:X,isEllipsisPlaceholder:!0});const R=Co.value.treeNodes[0],a=T.value,w=!!(!((x=R.children)===null||x===void 0)&&x.some(B=>a.includes(B.key)));return _(Re,{level:0,root:!0,key:"__ellpisisGroup__",internalKey:"__ellpisisGroup__",title:"···",virtualChildActive:w,tmNode:R,domId:X,rawNodes:R.rawNode.children||[],tmNodes:R.children||[],isEllipsisPlaceholder:!0})}return{mergedClsPrefix:t,controlledExpandedKeys:h,uncontrolledExpanededKeys:n,mergedExpandedKeys:p,uncontrolledValue:m,mergedValue:f,activePath:T,tmNodes:C,mergedTheme:l,mergedCollapsed:r,cssVars:o?void 0:$,themeClass:P==null?void 0:P.themeClass,overflowRef:G,counterRef:ge,updateCounter:()=>{},onResize:Le,onUpdateOverflow:_o,onUpdateCount:bo,renderCounter:wo,getCounter:go,onRender:P==null?void 0:P.onRender,showOption:N,deriveResponsiveState:Le}},render(){const{mergedClsPrefix:e,mode:t,themeClass:o,onRender:l}=this;l==null||l();const i=()=>this.tmNodes.map(s=>He(s,this.$props)),c=t==="horizontal"&&this.responsive,u=()=>_("div",{role:t==="horizontal"?"menubar":"menu",class:[`${e}-menu`,o,`${e}-menu--${t}`,c&&`${e}-menu--responsive`,this.mergedCollapsed&&`${e}-menu--collapsed`],style:this.cssVars},c?_(st,{ref:"overflowRef",onUpdateOverflow:this.onUpdateOverflow,getCounter:this.getCounter,onUpdateCount:this.onUpdateCount,updateCounter:this.updateCounter,style:{width:"100%",display:"flex",overflow:"hidden"}},{default:i,counter:this.renderCounter}):i());return c?_(Vo,{onResize:this.onResize},{default:u}):u()}}),jt={__name:"BreadCrumb",setup(e){const t=le(),o=ve();function l(r){r!==o.path&&t.push(r)}function i(r){return r!=null&&r.customIcon?lo(r.customIcon,{size:18}):r!=null&&r.icon?q(r.icon,{size:18}):null}return(r,c)=>{const u=_t,s=ft;return y(),M(s,null,{default:V(()=>[(y(!0),j(ne,null,Qe(I(o).matched.filter(m=>{var k;return!!((k=m.meta)!=null&&k.title)}),m=>(y(),M(u,{key:m.path,onClick:k=>l(m.path)},{default:V(()=>[(y(),M(eo(i(m.meta)))),oo(" "+pe(m.meta.title),1)]),_:2},1032,["onClick"]))),128))]),_:1})}}},Kt={class:"inline-block",viewBox:"0 0 24 24",width:"1em",height:"1em"},Vt=O("path",{fill:"currentColor",d:"M11 13h10v-2H11m0-2h10V7H11M3 3v2h18V3M3 21h18v-2H3m0-7l4 4V8m4 9h10v-2H11z"},null,-1),Dt=[Vt];function Ut(e,t){return y(),j("svg",Kt,[...Dt])}const Wt={name:"mdi-format-indent-decrease",render:Ut},Gt={class:"inline-block",viewBox:"0 0 24 24",width:"1em",height:"1em"},qt=O("path",{fill:"currentColor",d:"M11 13h10v-2H11m0-2h10V7H11M3 3v2h18V3M11 17h10v-2H11M3 8v8l4-4m-4 9h18v-2H3z"},null,-1),Yt=[qt];function Xt(e,t){return y(),j("svg",Gt,[...Yt])}const Zt={name:"mdi-format-indent-increase",render:Xt},Jt={__name:"MenuCollapse",setup(e){const t=ee();return(o,l)=>{const i=Zt,r=Wt,c=ae;return y(),M(c,{size:"20","cursor-pointer":"",onClick:I(t).switchCollapsed,title:o.$t(I(t).collapsed?"header.label_show_menu":"header.label_collapse_menu")},{default:V(()=>[I(t).collapsed?(y(),M(i,{key:0})):(y(),M(r,{key:1}))]),_:1},8,["onClick","title"])}}},Qt={class:"inline-block",viewBox:"0 0 24 24",width:"1em",height:"1em"},en=O("path",{fill:"currentColor",d:"m17.27 6.73l-4.24 10.13l-1.32-3.42l-.32-.83l-.82-.32l-3.43-1.33zM21 3L3 10.53v.97l6.84 2.66L12.5 21h.96z"},null,-1),on=[en];function tn(e,t){return y(),j("svg",Qt,[...on])}const nn={name:"mdi-navigation-variant-outline",render:tn},rn={__name:"Preview",setup(e){function t(){window.open("/")}return(o,l)=>{const i=nn,r=ae;return y(),M(r,{"mr-20":"",size:"18",style:{cursor:"pointer"},onClick:t,title:o.$t("header.label_preview")},{default:V(()=>[L(i)]),_:1},8,["title"])}}},ln={flex:"","cursor-pointer":"","items-center":""},an=["src"],cn={__name:"UserAvatar",setup(e){const{t}=Do(),o=le(),l=Uo(),i=[{label:t("header.label_profile"),key:"profile",icon:q("mdi-account-arrow-right-outline",{size:"14px"})},{label:t("header.label_logout"),key:"logout",icon:q("mdi:exit-to-app",{size:"14px"})}];function r(c){c==="profile"?o.push("/admin/profile"):c==="logout"&&$dialog.confirm({title:t("header.label_logout_dialog_title"),type:"warning",content:t("header.text_logout_confirm"),confirm(){l.logout(),$message.success(t("header.text_logout_success"))}})}return(c,u)=>{const s=Te;return y(),M(s,{options:i,onSelect:r},{default:V(()=>[O("div",ln,[O("img",{src:I(l).avatar,mr10:"","h-35":"","w-35":"","rounded-full":""},null,8,an),O("span",null,pe(I(l).name),1)])]),_:1})}}},sn={class:"inline-block",viewBox:"0 0 24 24",width:"1em",height:"1em"},dn=O("path",{fill:"currentColor",d:"m3.55 19.09l1.41 1.41l1.8-1.79l-1.42-1.42M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6s6-2.69 6-6c0-3.32-2.69-6-6-6m8 7h3v-2h-3m-2.76 7.71l1.8 1.79l1.41-1.41l-1.79-1.8M20.45 5l-1.41-1.4l-1.8 1.79l1.42 1.42M13 1h-2v3h2M6.76 5.39L4.96 3.6L3.55 5l1.79 1.81zM1 13h3v-2H1m12 9h-2v3h2"},null,-1),un=[dn];function hn(e,t){return y(),j("svg",sn,[...un])}const mn={name:"mdi-white-balance-sunny",render:hn},vn={class:"inline-block",viewBox:"0 0 24 24",width:"1em",height:"1em"},pn=O("path",{fill:"currentColor",d:"M2 12a10 10 0 0 0 13 9.54a10 10 0 0 1 0-19.08A10 10 0 0 0 2 12"},null,-1),fn=[pn];function gn(e,t){return y(),j("svg",vn,[...fn])}const bn={name:"mdi-moon-waning-crescent",render:gn},_n={__name:"ThemeMode",setup(e){const t=ee(),o=Wo(),l=()=>{t.toggleDark(),Go(o)()};return(i,r)=>{const c=bn,u=mn,s=ae;return y(),M(s,{"mr-20":"","cursor-pointer":"",size:"18",onClick:l,title:i.$t(I(o)?"header.label_lightmode":"header.label_darkmode")},{default:V(()=>[I(o)?(y(),M(c,{key:0})):(y(),M(u,{key:1}))]),_:1},8,["title"])}}},xn={class:"inline-block",viewBox:"0 0 24 24",width:"1em",height:"1em"},Cn=O("path",{fill:"currentColor",d:"M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"},null,-1),yn=[Cn];function wn(e,t){return y(),j("svg",xn,[...yn])}const zn={name:"mdi-github",render:wn},Sn={__name:"Github",setup(e){function t(){window.open("https://github.com/Robert-Stackflow/Moment")}return(o,l)=>{const i=zn,r=ae;return y(),M(r,{"mr-20":"",size:"18",style:{cursor:"pointer"},onClick:t,title:o.$t("header.label_github")},{default:V(()=>[L(i)]),_:1},8,["title"])}}},In={__name:"Wiki",setup(e){function t(){window.open("https://github.com/Robert-Stackflow/Moment/wiki")}return(o,l)=>{const i=it,r=ae;return y(),M(r,{"mr-20":"",size:"18",style:{cursor:"pointer"},onClick:t,title:o.$t("header.label_wiki")},{default:V(()=>[L(i,{icon:"mdi:file-document-outline",size:18})]),_:1},8,["title"])}}},kn={flex:"","items-center":""},Rn={"ml-auto":"",flex:"","items-center":""},$n={__name:"index",setup(e){return(t,o)=>(y(),j(ne,null,[O("div",kn,[L(Jt),L(jt,{"ml-15":"",hidden:"","sm:block":""})]),O("div",Rn,[L(rn),L(Sn),L(In),L(_n),L(cn)])],64))}},Pn={__name:"SideLogo",setup(e){var r,c,u,s;const t=ee(),o=qo(),l=Ve((r=o.metaSetting)==null?void 0:r.site_name)?(c=o.metaSetting)==null?void 0:c.site_name:"时光",i=Ve((u=o.metaSetting)==null?void 0:u.bottom_icon)?(s=o.metaSetting)==null?void 0:s.bottom_icon:"/assets/favicon.svg";return(m,k)=>{const f=at,n=to("router-link");return y(),M(n,{"h-60":"","f-c-c":"",to:"/admin/"},{default:V(()=>[L(f,{width:"25.6",src:I(i),class:"icon",style:{"border-radius":"30px","margin-right":"5px"}},null,8,["src"]),no(O("h1",{"ml-2":"","mr-8":"","max-w-150":"","flex-shrink-0":"","text-16":"","font-bold":""},pe(I(l)),513),[[Yo,!I(t).collapsed]])]),_:1})}}},Tn={__name:"SideMenu",setup(e){const t=le(),o=ve(),l=Xo(),i=ee(),r=S(()=>{var n;return((n=o.meta)==null?void 0:n.activeMenu)||o.name}),c=S(()=>l.menus.map(n=>m(n)).sort((n,v)=>n.order-v.order)),u=E(null);we(o,()=>de(this,null,function*(){var n;yield ze(),(n=u.value)==null||n.showOption()}));function s(n,v){return De(v)?v:"/"+[n,v].filter(h=>!!h&&h!=="/").map(h=>h.replace(/(^\/)|(\/$)/g,"")).join("/")}function m(n,v=""){var C,T;let h={label:n.meta&&n.meta.title||n.name,key:n.name,path:s(v,n.path),icon:k(n.meta),order:((C=n.meta)==null?void 0:C.order)||0};const p=n.children?n.children.filter(H=>H.name&&!H.isHidden):[];if(!p.length)return h;if(p.length===1){const H=p[0];h=je(Fe({},h),{label:((T=H.meta)==null?void 0:T.title)||H.name,key:H.name,path:s(h.path,H.path),icon:k(H.meta)});const K=H.children?H.children.filter(F=>F.name&&!F.isHidden):[];K.length===1?h=m(K[0],h.path):K.length>1&&(h.children=K.map(F=>m(F,h.path)).sort((F,N)=>F.order-N.order))}else h.children=p.map(H=>m(H,h.path)).sort((H,K)=>H.order-K.order);return h}function k(n){return n!=null&&n.customIcon?lo(n.customIcon,{size:18}):n!=null&&n.icon?q(n.icon,{size:18}):null}function f(n,v){De(v.path)?window.open(v.path):v.path===o.path?i.reloadPage():t.push(v.path)}return(n,v)=>{const h=Ft;return y(),M(h,{ref_key:"menu",ref:u,class:"side-menu",accordion:"",indent:18,"collapsed-icon-size":22,"collapsed-width":64,options:I(c),value:I(r),"onUpdate:value":f,"default-expanded-keys":["内容管理","系统管理"]},null,8,["options","value"])}}},An={__name:"index",setup(e){return(t,o)=>(y(),j(ne,null,[L(Pn),L(Tn)],64))}},Nn={__name:"AppMain",setup(e){const t=ee(),l=le().getRoutes(),i=S(()=>l.filter(r=>{var c;return(c=r.meta)==null?void 0:c.keepAlive}).map(r=>r.name));return(r,c)=>{const u=to("router-view");return y(),M(u,null,{default:V(({Component:s,route:m})=>[(y(),M(Zo,{include:I(i)},[I(t).reloadFlag?(y(),M(eo(s),{key:I(t).aliveKeys[m.name]||m.fullPath})):fe("",!0)],1032,["include"]))]),_:1})}}},Bn={__name:"ContextMenu",props:{show:{type:Boolean,default:!1},currentPath:{type:String,default:""},x:{type:Number,default:0},y:{type:Number,default:0}},emits:["update:show"],setup(e,{emit:t}){const o=e,l=t,i=ro(),r=ee(),c=S(()=>[{label:"重新加载",key:"reload",disabled:o.currentPath!==i.activeTag,icon:q("mdi:refresh",{size:"14px"})},{label:"关闭",key:"close",disabled:i.tags.length<=1,icon:q("mdi:close",{size:"14px"})},{label:"关闭其他",key:"close-other",disabled:i.tags.length<=1,icon:q("mdi:arrow-expand-horizontal",{size:"14px"})},{label:"关闭左侧",key:"close-left",disabled:i.tags.length<=1||o.currentPath===i.tags[0].path,icon:q("mdi:arrow-expand-left",{size:"14px"})},{label:"关闭右侧",key:"close-right",disabled:i.tags.length<=1||o.currentPath===i.tags[i.tags.length-1].path,icon:q("mdi:arrow-expand-right",{size:"14px"})}]),u=ve(),s=new Map([["reload",()=>{var f;(f=u.meta)!=null&&f.keepAlive&&r.setAliveKeys(u.name,+new Date),r.reloadPage()}],["close",()=>{i.removeTag(o.currentPath)}],["close-other",()=>{i.removeOther(o.currentPath)}],["close-left",()=>{i.removeLeft(o.currentPath)}],["close-right",()=>{i.removeRight(o.currentPath)}]]);function m(){l("update:show",!1)}function k(f){const n=s.get(f);n&&n(),m()}return(f,n)=>{const v=Te;return y(),M(v,{show:e.show,options:I(c),x:e.x,y:e.y,placement:"bottom-start",onClickoutside:m,onSelect:k},null,8,["show","options","x","y"])}}},Mn={class:"inline-block",viewBox:"0 0 24 24",width:"1em",height:"1em"},Hn=O("path",{fill:"currentColor",d:"M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"},null,-1),Ln=[Hn];function En(e,t){return y(),j("svg",Mn,[...Ln])}const On={name:"ic-baseline-keyboard-arrow-right",render:En},Fn={class:"inline-block",viewBox:"0 0 24 24",width:"1em",height:"1em"},jn=O("path",{fill:"currentColor",d:"M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6l6 6z"},null,-1),Kn=[jn];function Vn(e,t){return y(),j("svg",Fn,[...Kn])}const Dn={name:"ic-baseline-keyboard-arrow-left",render:Vn},Un={__name:"ScrollX",props:{showArrow:{type:Boolean,default:!0}},setup(e,{expose:t}){const o=E(0),l=E(null),i=E(null),r=E(!1),c=Ue(()=>{var v,h;const f=(v=i.value)==null?void 0:v.offsetWidth,n=(h=l.value)==null?void 0:h.offsetWidth;r.value=n>f,s(f,n)},200);function u(f){var p,C;const{wheelDelta:n}=f,v=(p=i.value)==null?void 0:p.offsetWidth,h=(C=l.value)==null?void 0:C.offsetWidth;n<0&&(v>h&&o.value<-10||v<=h&&h+o.value-v<-10)||n>0&&o.value>10||(o.value+=n,s(v,h))}const s=Ue(function(f,n){r.value?-o.value>n-f?o.value=f-n:o.value>0&&(o.value=0):o.value=0},200),m=E(null);Ye(()=>{c(),m.value=Jo(document.body,c)}),Qo(()=>{var f;(f=m.value)==null||f.disconnect()});function k(f,n){var p,C;const v=(p=i.value)==null?void 0:p.offsetWidth,h=(C=l.value)==null?void 0:C.offsetWidth;h<=v||(f<-o.value+150&&(o.value=-(f-150),s(v,h)),f+n>-o.value+v&&(o.value=v-(f+n),s(v,h)))}return t({handleScroll:k}),(f,n)=>{const v=Dn,h=On,p=et("resize");return y(),j("div",{ref_key:"wrapper",ref:i,class:"wrapper",onMousewheel:Ie(u,["prevent"])},[e.showArrow&&I(r)?(y(),j(ne,{key:0},[O("div",{class:"left",onClick:n[0]||(n[0]=C=>u({wheelDelta:120}))},[L(v)]),O("div",{class:"right",onClick:n[1]||(n[1]=C=>u({wheelDelta:-120}))},[L(h)])],64)):fe("",!0),no((y(),j("div",{ref_key:"content",ref:l,class:ot(["content",{overflow:I(r)&&e.showArrow}]),style:Se({transform:`translateX(${I(o)}px)`})},[tt(f.$slots,"default",{},void 0,!0)],6)),[[p,I(c)]])],544)}}},Wn=ht(Un,[["__scopeId","data-v-d8916ce1"]]),Gn={__name:"index",setup(e){const t=ve(),o=le(),l=ro(),i=E([]),r=E(null),c=io({show:!1,x:0,y:0,currentPath:""});we(()=>t.path,()=>{var p;const{name:n,fullPath:v}=t,h=(p=t.meta)==null?void 0:p.title;l.addTag({name:n,path:v,title:h})},{immediate:!0}),we(()=>l.activeIndex,n=>de(this,null,function*(){var C,T;yield ze();const v=(C=i.value[n])==null?void 0:C.$el;if(!v)return;const{offsetLeft:h,offsetWidth:p}=v;(T=r.value)==null||T.handleScroll(h+p,p)}),{immediate:!0});const u=n=>{l.setActiveTag(n),o.push(n)};function s(){c.show=!0}function m(){c.show=!1}function k(n,v,h){Object.assign(c,{x:n,y:v,currentPath:h})}function f(n,v){return de(this,null,function*(){const{clientX:h,clientY:p}=n;m(),k(h,p,v.path),yield ze(),s()})}return(n,v)=>{const h=dt;return y(),M(Wn,{ref_key:"scrollXRef",ref:r,class:"bg-white dark:bg-dark!"},{default:V(()=>[(y(!0),j(ne,null,Qe(I(l).tags,p=>(y(),M(h,{ref_for:!0,ref_key:"tabRefs",ref:i,key:p.path,class:"mx-5 cursor-pointer rounded-4 px-15 hover:color-primary",type:I(l).activeTag===p.path?"primary":"default",closable:I(l).tags.length>1,onClick:C=>u(p.path),onClose:Ie(C=>I(l).removeTag(p.path),["stop"]),onContextmenu:Ie(C=>f(C,p),["prevent"])},{default:V(()=>[oo(pe(p.title),1)]),_:2},1032,["type","closable","onClick","onClose","onContextmenu"]))),128)),I(c).show?(y(),M(Bn,{key:0,show:I(c).show,"onUpdate:show":v[0]||(v[0]=p=>I(c).show=p),"current-path":I(c).currentPath,x:I(c).x,y:I(c).y},null,8,["show","current-path","x","y"])):fe("",!0)]),_:1},512)}}},qn={"flex-col":"","flex-1":"","overflow-hidden":""},Yn={key:0,hidden:"","border-b":"","bc-eee":"","sm:block":"","dark:border-0":""},Xn={"flex-1":"","overflow-hidden":"","bg-hex-f5f6fb":"","dark:bg-hex-101014":""},cr={__name:"index",setup(e){const t=ee(),l=io(nt({xl:1600,lg:1199,md:991,sm:666,xs:575})),i=l.smaller("sm"),r=l.between("sm","md"),c=l.greater("md");return ye(()=>{i.value&&(t.setCollapsed(!0),t.setFullScreen(!1)),r.value&&(t.setCollapsed(!0),t.setFullScreen(!1)),c.value&&(t.setCollapsed(!1),t.setFullScreen(!0))}),(u,s)=>{const m=Pt,k=St;return y(),M(k,{"has-sider":"","wh-full":""},{default:V(()=>[L(m,{bordered:"","collapse-mode":"width","collapsed-width":64,width:220,"native-scrollbar":!1,collapsed:I(t).collapsed},{default:V(()=>[L(An)]),_:1},8,["collapsed"]),O("article",qn,[O("header",{class:"flex items-center border-b bg-white px-15 bc-eee",dark:"bg-dark border-0",style:Se(`height: ${I(rt).height}px`)},[L($n)],4),I(We).visible?(y(),j("section",Yn,[L(Gn,{style:Se({height:`${I(We).height}px`})},null,8,["style"])])):fe("",!0),O("section",Xn,[L(Nn)])])]),_:1})}}};export{cr as default};
