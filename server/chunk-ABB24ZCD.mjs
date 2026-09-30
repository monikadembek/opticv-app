import './polyfills.server.mjs';
import{D as d,E as f,F as m,Ga as c,H as s,N as g,Pa as l,Qa as S,Ra as b,Sa as D,Z as p,fe as a,he as B,ja as u,je as E,ke as C,le as i,mb as I,pb as o,ra as y,sa as h,tc as N,wa as k,xa as v,yb as M}from"./chunk-MCMZIWXD.mjs";var F=`
    .p-progressspinner {
        position: relative;
        margin: 0 auto;
        width: 100px;
        height: 100px;
        display: inline-block;
    }

    .p-progressspinner::before {
        content: '';
        display: block;
        padding-top: 100%;
    }

    .p-progressspinner-spin {
        height: 100%;
        transform-origin: center center;
        width: 100%;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        margin: auto;
        animation: p-progressspinner-rotate 2s linear infinite;
    }

    .p-progressspinner-circle {
        stroke-dasharray: 89, 200;
        stroke-dashoffset: 0;
        stroke: dt('progressspinner.colorOne');
        animation:
            p-progressspinner-dash 1.5s ease-in-out infinite,
            p-progressspinner-color 6s ease-in-out infinite;
        stroke-linecap: round;
    }

    @keyframes p-progressspinner-rotate {
        100% {
            transform: rotate(360deg);
        }
    }
    @keyframes p-progressspinner-dash {
        0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
        }
        50% {
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -35px;
        }
        100% {
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -124px;
        }
    }
    @keyframes p-progressspinner-color {
        100%,
        0% {
            stroke: dt('progressspinner.color.one');
        }
        40% {
            stroke: dt('progressspinner.color.two');
        }
        66% {
            stroke: dt('progressspinner.color.three');
        }
        80%,
        90% {
            stroke: dt('progressspinner.color.four');
        }
    }
`;var R={root:()=>["p-progressspinner"],spin:"p-progressspinner-spin",circle:"p-progressspinner-circle"},w=(()=>{class e extends B{name="progressspinner";style=F;classes=R;static \u0275fac=(()=>{let r;return function(n){return(r||(r=p(e)))(n||e)}})();static \u0275prov=d({token:e,factory:e.\u0275fac})}return e})();var P=new m("PROGRESSSPINNER_INSTANCE"),j=(()=>{class e extends C{componentName="ProgressSpinner";$pcProgressSpinner=s(P,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=s(i,{self:!0});styleClass;strokeWidth="2";fill="none";animationDuration="2s";ariaLabel;onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}_componentStyle=s(w);static \u0275fac=(()=>{let r;return function(n){return(r||(r=p(e)))(n||e)}})();static \u0275cmp=y({type:e,selectors:[["p-progressSpinner"],["p-progress-spinner"],["p-progressspinner"]],hostVars:5,hostBindings:function(t,n){t&2&&(c("aria-label",n.ariaLabel)("role","progressbar")("aria-busy",!0),o(n.cn(n.cx("root"),n.styleClass)))},inputs:{styleClass:"styleClass",strokeWidth:"strokeWidth",fill:"fill",animationDuration:"animationDuration",ariaLabel:"ariaLabel"},features:[M([w,{provide:P,useExisting:e},{provide:E,useExisting:e}]),k([i]),v],decls:2,vars:10,consts:[["viewBox","25 25 50 50",3,"pBind"],["cx","50","cy","50","r","20","stroke-miterlimit","10",3,"pBind"]],template:function(t,n){t&1&&(g(),S(0,"svg",0),D(1,"circle",1),b()),t&2&&(o(n.cx("spin")),I("animation-duration",n.animationDuration),l("pBind",n.ptm("spin")),u(),o(n.cx("circle")),l("pBind",n.ptm("circle")),c("fill",n.fill)("stroke-width",n.strokeWidth))},dependencies:[N,a,i],encapsulation:2,changeDetection:0})}return e})(),X=(()=>{class e{static \u0275fac=function(t){return new(t||e)};static \u0275mod=h({type:e});static \u0275inj=f({imports:[j,a,a]})}return e})();export{j as a,X as b};
