import{ia as z,ja as m,la as q,na as G,oa as H,pa as l}from"./chunk-45OFMATO.js";import{$a as _,F as k,G as T,H as x,Ha as r,Ia as v,J as d,Ja as y,Ka as S,Ob as R,Pb as V,Qa as M,Va as c,Vb as j,Xb as O,Ya as A,Zb as Q,_ as b,_a as h,eb as u,fa as a,hb as o,ib as D,lb as E,na as B,oa as w,qb as N,sa as I,sb as F,ta as P,ua as f,ya as s}from"./chunk-D3O5QWZT.js";var $=`
    .p-progressbar {
        display: block;
        position: relative;
        overflow: hidden;
        height: dt('progressbar.height');
        background: dt('progressbar.background');
        border-radius: dt('progressbar.border.radius');
    }

    .p-progressbar-value {
        margin: 0;
        background: dt('progressbar.value.background');
    }

    .p-progressbar-label {
        color: dt('progressbar.label.color');
        font-size: dt('progressbar.label.font.size');
        font-weight: dt('progressbar.label.font.weight');
    }

    .p-progressbar-determinate .p-progressbar-value {
        height: 100%;
        width: 0%;
        position: absolute;
        display: none;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        transition: width 1s ease-in-out;
    }

    .p-progressbar-determinate .p-progressbar-label {
        display: inline-flex;
    }

    .p-progressbar-indeterminate .p-progressbar-value::before {
        content: '';
        position: absolute;
        background: inherit;
        inset-block-start: 0;
        inset-inline-start: 0;
        inset-block-end: 0;
        will-change: inset-inline-start, inset-inline-end;
        animation: p-progressbar-indeterminate-anim 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
    }

    .p-progressbar-indeterminate .p-progressbar-value::after {
        content: '';
        position: absolute;
        background: inherit;
        inset-block-start: 0;
        inset-inline-start: 0;
        inset-block-end: 0;
        will-change: inset-inline-start, inset-inline-end;
        animation: p-progressbar-indeterminate-anim-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
        animation-delay: 1.15s;
    }

    @keyframes p-progressbar-indeterminate-anim {
        0% {
            inset-inline-start: -35%;
            inset-inline-end: 100%;
        }
        60% {
            inset-inline-start: 100%;
            inset-inline-end: -90%;
        }
        100% {
            inset-inline-start: 100%;
            inset-inline-end: -90%;
        }
    }
    @-webkit-keyframes p-progressbar-indeterminate-anim {
        0% {
            inset-inline-start: -35%;
            inset-inline-end: 100%;
        }
        60% {
            inset-inline-start: 100%;
            inset-inline-end: -90%;
        }
        100% {
            inset-inline-start: 100%;
            inset-inline-end: -90%;
        }
    }

    @keyframes p-progressbar-indeterminate-anim-short {
        0% {
            inset-inline-start: -200%;
            inset-inline-end: 100%;
        }
        60% {
            inset-inline-start: 107%;
            inset-inline-end: -8%;
        }
        100% {
            inset-inline-start: 107%;
            inset-inline-end: -8%;
        }
    }
    @-webkit-keyframes p-progressbar-indeterminate-anim-short {
        0% {
            inset-inline-start: -200%;
            inset-inline-end: 100%;
        }
        60% {
            inset-inline-start: 107%;
            inset-inline-end: -8%;
        }
        100% {
            inset-inline-start: 107%;
            inset-inline-end: -8%;
        }
    }
`;var L=["content"],U=n=>({$implicit:n});function W(n,g){if(n&1&&(v(0,"div"),D(1),y()),n&2){let e=c(2);u("display",e.value!=null&&e.value!==0?"flex":"none"),a(),E("",e.value,"",e.unit)}}function X(n,g){n&1&&M(0)}function Y(n,g){if(n&1&&(v(0,"div",2)(1,"div",2),f(2,W,2,4,"div",3)(3,X,1,0,"ng-container",4),y()()),n&2){let e=c();o(e.cn(e.cx("value"),e.valueStyleClass)),u("width",e.value+"%")("display","flex")("background",e.color),r("pBind",e.ptm("value")),s("data-p",e.dataP),a(),o(e.cx("label")),r("pBind",e.ptm("label")),s("data-p",e.dataP),a(),r("ngIf",e.showValue&&!e.contentTemplate&&!e._contentTemplate),a(),r("ngTemplateOutlet",e.contentTemplate||e._contentTemplate)("ngTemplateOutletContext",F(17,U,e.value))}}function Z(n,g){if(n&1&&S(0,"div",2),n&2){let e=c();o(e.cn(e.cx("value"),e.valueStyleClass)),u("background",e.color),r("pBind",e.ptm("value")),s("data-p",e.dataP)}}var ee={root:({instance:n})=>["p-progressbar p-component",{"p-progressbar-determinate":n.mode=="determinate","p-progressbar-indeterminate":n.mode=="indeterminate"}],value:"p-progressbar-value",label:"p-progressbar-label"},J=(()=>{class n extends q{name="progressbar";style=$;classes=ee;static \u0275fac=(()=>{let e;return function(t){return(e||(e=b(n)))(t||n)}})();static \u0275prov=k({token:n,factory:n.\u0275fac})}return n})();var K=new x("PROGRESSBAR_INSTANCE"),ne=(()=>{class n extends H{componentName="ProgressBar";$pcProgressBar=d(K,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=d(l,{self:!0});value;showValue=!0;styleClass;valueStyleClass;unit="%";mode="determinate";color;contentTemplate;onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}_componentStyle=d(J);templates;_contentTemplate;onAfterContentInit(){this.templates?.forEach(e=>{e.getType()==="content"?this._contentTemplate=e.template:this._contentTemplate=e.template})}get dataP(){return this.cn({determinate:this.mode==="determinate",indeterminate:this.mode==="indeterminate"})}static \u0275fac=(()=>{let e;return function(t){return(e||(e=b(n)))(t||n)}})();static \u0275cmp=B({type:n,selectors:[["p-progressBar"],["p-progressbar"],["p-progress-bar"]],contentQueries:function(i,t,C){if(i&1&&A(C,L,4)(C,z,4),i&2){let p;h(p=_())&&(t.contentTemplate=p.first),h(p=_())&&(t.templates=p)}},hostAttrs:["role","progressbar"],hostVars:7,hostBindings:function(i,t){i&2&&(s("aria-valuemin",0)("aria-valuenow",t.value)("aria-valuemax",100)("aria-level",t.value+t.unit)("data-p",t.dataP),o(t.cn(t.cx("root"),t.styleClass)))},inputs:{value:[2,"value","value",V],showValue:[2,"showValue","showValue",R],styleClass:"styleClass",valueStyleClass:"valueStyleClass",unit:"unit",mode:"mode",color:"color"},features:[N([J,{provide:K,useExisting:n},{provide:G,useExisting:n}]),I([l]),P],decls:2,vars:2,consts:[[3,"class","pBind","width","display","background",4,"ngIf"],[3,"class","pBind","background",4,"ngIf"],[3,"pBind"],[3,"display",4,"ngIf"],[4,"ngTemplateOutlet","ngTemplateOutletContext"]],template:function(i,t){i&1&&f(0,Y,4,19,"div",0)(1,Z,1,6,"div",1),i&2&&(r("ngIf",t.mode==="determinate"),a(),r("ngIf",t.mode==="indeterminate"))},dependencies:[Q,j,O,m,l],encapsulation:2,changeDetection:0})}return n})(),Ce=(()=>{class n{static \u0275fac=function(i){return new(i||n)};static \u0275mod=w({type:n});static \u0275inj=T({imports:[ne,m,m]})}return n})();export{ne as a,Ce as b};
