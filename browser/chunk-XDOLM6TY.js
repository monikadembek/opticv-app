import{a as de,d as me}from"./chunk-UWOJQS63.js";import{Ad as ce,Bb as ee,Cd as re,Dd as le,E as I,Ea as o,Eb as ne,Ed as x,F as z,Fa as f,G as B,Ga as b,Ha as h,I as y,Id as pe,K as E,Kb as k,L as O,M as S,Na as w,Oa as V,Ob as te,Qa as L,Qb as se,R as D,Sa as a,Sb as oe,Ta as q,Ua as G,Ub as ie,V as N,Va as W,Xa as _,Y as M,Ya as v,ab as $,ba as P,cb as J,da as c,eb as g,fb as K,gb as U,ka as A,la as F,nb as X,pa as j,pb as Y,qa as R,ra as u,va as r,wa as H,xa as Q,xd as ae,ya as m,yd as C,za as p,zb as Z}from"./chunk-2OJBEAHT.js";import{a as T}from"./chunk-ZGVHDELW.js";var ge=`
    .p-message {
        display: grid;
        grid-template-rows: 1fr;
        border-radius: dt('message.border.radius');
        outline-width: dt('message.border.width');
        outline-style: solid;
    }

    .p-message-content-wrapper {
        min-height: 0;
    }

    .p-message-content {
        display: flex;
        align-items: center;
        padding: dt('message.content.padding');
        gap: dt('message.content.gap');
    }

    .p-message-icon {
        flex-shrink: 0;
    }

    .p-message-close-button {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-inline-start: auto;
        overflow: hidden;
        position: relative;
        width: dt('message.close.button.width');
        height: dt('message.close.button.height');
        border-radius: dt('message.close.button.border.radius');
        background: transparent;
        transition:
            background dt('message.transition.duration'),
            color dt('message.transition.duration'),
            outline-color dt('message.transition.duration'),
            box-shadow dt('message.transition.duration'),
            opacity 0.3s;
        outline-color: transparent;
        color: inherit;
        padding: 0;
        border: none;
        cursor: pointer;
        user-select: none;
    }

    .p-message-close-icon {
        font-size: dt('message.close.icon.size');
        width: dt('message.close.icon.size');
        height: dt('message.close.icon.size');
    }

    .p-message-close-button:focus-visible {
        outline-width: dt('message.close.button.focus.ring.width');
        outline-style: dt('message.close.button.focus.ring.style');
        outline-offset: dt('message.close.button.focus.ring.offset');
    }

    .p-message-info {
        background: dt('message.info.background');
        outline-color: dt('message.info.border.color');
        color: dt('message.info.color');
        box-shadow: dt('message.info.shadow');
    }

    .p-message-info .p-message-close-button:focus-visible {
        outline-color: dt('message.info.close.button.focus.ring.color');
        box-shadow: dt('message.info.close.button.focus.ring.shadow');
    }

    .p-message-info .p-message-close-button:hover {
        background: dt('message.info.close.button.hover.background');
    }

    .p-message-info.p-message-outlined {
        color: dt('message.info.outlined.color');
        outline-color: dt('message.info.outlined.border.color');
    }

    .p-message-info.p-message-simple {
        color: dt('message.info.simple.color');
    }

    .p-message-success {
        background: dt('message.success.background');
        outline-color: dt('message.success.border.color');
        color: dt('message.success.color');
        box-shadow: dt('message.success.shadow');
    }

    .p-message-success .p-message-close-button:focus-visible {
        outline-color: dt('message.success.close.button.focus.ring.color');
        box-shadow: dt('message.success.close.button.focus.ring.shadow');
    }

    .p-message-success .p-message-close-button:hover {
        background: dt('message.success.close.button.hover.background');
    }

    .p-message-success.p-message-outlined {
        color: dt('message.success.outlined.color');
        outline-color: dt('message.success.outlined.border.color');
    }

    .p-message-success.p-message-simple {
        color: dt('message.success.simple.color');
    }

    .p-message-warn {
        background: dt('message.warn.background');
        outline-color: dt('message.warn.border.color');
        color: dt('message.warn.color');
        box-shadow: dt('message.warn.shadow');
    }

    .p-message-warn .p-message-close-button:focus-visible {
        outline-color: dt('message.warn.close.button.focus.ring.color');
        box-shadow: dt('message.warn.close.button.focus.ring.shadow');
    }

    .p-message-warn .p-message-close-button:hover {
        background: dt('message.warn.close.button.hover.background');
    }

    .p-message-warn.p-message-outlined {
        color: dt('message.warn.outlined.color');
        outline-color: dt('message.warn.outlined.border.color');
    }

    .p-message-warn.p-message-simple {
        color: dt('message.warn.simple.color');
    }

    .p-message-error {
        background: dt('message.error.background');
        outline-color: dt('message.error.border.color');
        color: dt('message.error.color');
        box-shadow: dt('message.error.shadow');
    }

    .p-message-error .p-message-close-button:focus-visible {
        outline-color: dt('message.error.close.button.focus.ring.color');
        box-shadow: dt('message.error.close.button.focus.ring.shadow');
    }

    .p-message-error .p-message-close-button:hover {
        background: dt('message.error.close.button.hover.background');
    }

    .p-message-error.p-message-outlined {
        color: dt('message.error.outlined.color');
        outline-color: dt('message.error.outlined.border.color');
    }

    .p-message-error.p-message-simple {
        color: dt('message.error.simple.color');
    }

    .p-message-secondary {
        background: dt('message.secondary.background');
        outline-color: dt('message.secondary.border.color');
        color: dt('message.secondary.color');
        box-shadow: dt('message.secondary.shadow');
    }

    .p-message-secondary .p-message-close-button:focus-visible {
        outline-color: dt('message.secondary.close.button.focus.ring.color');
        box-shadow: dt('message.secondary.close.button.focus.ring.shadow');
    }

    .p-message-secondary .p-message-close-button:hover {
        background: dt('message.secondary.close.button.hover.background');
    }

    .p-message-secondary.p-message-outlined {
        color: dt('message.secondary.outlined.color');
        outline-color: dt('message.secondary.outlined.border.color');
    }

    .p-message-secondary.p-message-simple {
        color: dt('message.secondary.simple.color');
    }

    .p-message-contrast {
        background: dt('message.contrast.background');
        outline-color: dt('message.contrast.border.color');
        color: dt('message.contrast.color');
        box-shadow: dt('message.contrast.shadow');
    }

    .p-message-contrast .p-message-close-button:focus-visible {
        outline-color: dt('message.contrast.close.button.focus.ring.color');
        box-shadow: dt('message.contrast.close.button.focus.ring.shadow');
    }

    .p-message-contrast .p-message-close-button:hover {
        background: dt('message.contrast.close.button.hover.background');
    }

    .p-message-contrast.p-message-outlined {
        color: dt('message.contrast.outlined.color');
        outline-color: dt('message.contrast.outlined.border.color');
    }

    .p-message-contrast.p-message-simple {
        color: dt('message.contrast.simple.color');
    }

    .p-message-text {
        font-size: dt('message.text.font.size');
        font-weight: dt('message.text.font.weight');
    }

    .p-message-icon {
        font-size: dt('message.icon.size');
        width: dt('message.icon.size');
        height: dt('message.icon.size');
    }

    .p-message-sm .p-message-content {
        padding: dt('message.content.sm.padding');
    }

    .p-message-sm .p-message-text {
        font-size: dt('message.text.sm.font.size');
    }

    .p-message-sm .p-message-icon {
        font-size: dt('message.icon.sm.size');
        width: dt('message.icon.sm.size');
        height: dt('message.icon.sm.size');
    }

    .p-message-sm .p-message-close-icon {
        font-size: dt('message.close.icon.sm.size');
        width: dt('message.close.icon.sm.size');
        height: dt('message.close.icon.sm.size');
    }

    .p-message-lg .p-message-content {
        padding: dt('message.content.lg.padding');
    }

    .p-message-lg .p-message-text {
        font-size: dt('message.text.lg.font.size');
    }

    .p-message-lg .p-message-icon {
        font-size: dt('message.icon.lg.size');
        width: dt('message.icon.lg.size');
        height: dt('message.icon.lg.size');
    }

    .p-message-lg .p-message-close-icon {
        font-size: dt('message.close.icon.lg.size');
        width: dt('message.close.icon.lg.size');
        height: dt('message.close.icon.lg.size');
    }

    .p-message-outlined {
        background: transparent;
        outline-width: dt('message.outlined.border.width');
    }

    .p-message-simple {
        background: transparent;
        outline-color: transparent;
        box-shadow: none;
    }

    .p-message-simple .p-message-content {
        padding: dt('message.simple.content.padding');
    }

    .p-message-outlined .p-message-close-button:hover,
    .p-message-simple .p-message-close-button:hover {
        background: transparent;
    }

    .p-message-enter-active {
        animation: p-animate-message-enter 0.3s ease-out forwards;
        overflow: hidden;
    }

    .p-message-leave-active {
        animation: p-animate-message-leave 0.15s ease-in forwards;
        overflow: hidden;
    }

    @keyframes p-animate-message-enter {
        from {
            opacity: 0;
            grid-template-rows: 0fr;
        }
        to {
            opacity: 1;
            grid-template-rows: 1fr;
        }
    }

    @keyframes p-animate-message-leave {
        from {
            opacity: 1;
            grid-template-rows: 1fr;
        }
        to {
            opacity: 0;
            margin: 0;
            grid-template-rows: 0fr;
        }
    }
`;var be=["container"],he=["icon"],_e=["closeicon"],ve=["*"],xe=n=>({closeCallback:n});function ye(n,i){n&1&&w(0)}function we(n,i){if(n&1&&u(0,ye,1,0,"ng-container",4),n&2){let e=a();o("ngTemplateOutlet",e.iconTemplate||e._iconTemplate)}}function Ce(n,i){if(n&1&&h(0,"i",1),n&2){let e=a();g(e.cn(e.cx("icon"),e.icon)),o("pBind",e.ptm("icon")),r("data-p",e.dataP)}}function Te(n,i){n&1&&w(0)}function Me(n,i){if(n&1&&u(0,Te,1,0,"ng-container",5),n&2){let e=a();o("ngTemplateOutlet",e.containerTemplate||e._containerTemplate)("ngTemplateOutletContext",Y(2,xe,e.closeCallback))}}function ke(n,i){if(n&1&&h(0,"span",9),n&2){let e=a(3);o("pBind",e.ptm("text"))("ngClass",e.cx("text"))("innerHTML",e.text,P),r("data-p",e.dataP)}}function Ie(n,i){if(n&1&&(f(0,"div"),u(1,ke,1,4,"span",8),b()),n&2){let e=a(2);c(),o("ngIf",!e.escape)}}function ze(n,i){if(n&1&&(f(0,"span",7),K(1),b()),n&2){let e=a(3);o("pBind",e.ptm("text"))("ngClass",e.cx("text")),r("data-p",e.dataP),c(),U(e.text)}}function Be(n,i){if(n&1&&u(0,ze,2,4,"span",10),n&2){let e=a(2);o("ngIf",e.escape&&e.text)}}function Ee(n,i){if(n&1&&(u(0,Ie,2,1,"div",6)(1,Be,1,1,"ng-template",null,0,Z),f(3,"span",7),G(4),b()),n&2){let e=$(2),s=a();o("ngIf",!s.escape)("ngIfElse",e),c(3),o("pBind",s.ptm("text"))("ngClass",s.cx("text")),r("data-p",s.dataP)}}function Oe(n,i){if(n&1&&h(0,"i",7),n&2){let e=a(2);g(e.cn(e.cx("closeIcon"),e.closeIcon)),o("pBind",e.ptm("closeIcon"))("ngClass",e.closeIcon),r("data-p",e.dataP)}}function Se(n,i){n&1&&w(0)}function De(n,i){if(n&1&&u(0,Se,1,0,"ng-container",4),n&2){let e=a(2);o("ngTemplateOutlet",e.closeIconTemplate||e._closeIconTemplate)}}function Ne(n,i){if(n&1&&(S(),h(0,"svg",14)),n&2){let e=a(2);g(e.cx("closeIcon")),o("pBind",e.ptm("closeIcon")),r("data-p",e.dataP)}}function Pe(n,i){if(n&1){let e=V();f(0,"button",11),L("click",function(t){E(e);let l=a();return O(l.close(t))}),m(1,Oe,1,5,"i",12),m(2,De,1,1,"ng-container"),m(3,Ne,1,4,":svg:svg",13),b()}if(n&2){let e=a();g(e.cx("closeButton")),o("pBind",e.ptm("closeButton")),r("aria-label",e.closeAriaLabel)("data-p",e.dataP),c(),p(e.closeIcon?1:-1),c(),p(e.closeIconTemplate||e._closeIconTemplate?2:-1),c(),p(!e.closeIconTemplate&&!e._closeIconTemplate&&!e.closeIcon?3:-1)}}var Ae={root:({instance:n})=>["p-message p-component p-message-"+n.severity,n.variant&&"p-message-"+n.variant,{"p-message-sm":n.size==="small","p-message-lg":n.size==="large"}],contentWrapper:"p-message-content-wrapper",content:"p-message-content",icon:"p-message-icon",text:"p-message-text",closeButton:"p-message-close-button",closeIcon:"p-message-close-icon"},ue=(()=>{class n extends ce{name="message";style=ge;classes=Ae;static \u0275fac=(()=>{let e;return function(t){return(e||(e=M(n)))(t||n)}})();static \u0275prov=I({token:n,factory:n.\u0275fac})}return n})();var fe=new B("MESSAGE_INSTANCE"),Fe=(()=>{class n extends le{componentName="Message";_componentStyle=y(ue);bindDirectiveInstance=y(x,{self:!0});$pcMessage=y(fe,{optional:!0,skipSelf:!0})??void 0;onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}severity="info";text;escape=!0;style;styleClass;closable=!1;icon;closeIcon;life;showTransitionOptions="300ms ease-out";hideTransitionOptions="200ms cubic-bezier(0.86, 0, 0.07, 1)";size;variant;motionOptions=ne(void 0);computedMotionOptions=ee(()=>T(T({},this.ptm("motion")),this.motionOptions()));onClose=new D;get closeAriaLabel(){return this.config.translation.aria?this.config.translation.aria.close:void 0}visible=N(!0);containerTemplate;iconTemplate;closeIconTemplate;templates;_containerTemplate;_iconTemplate;_closeIconTemplate;closeCallback=e=>{this.close(e)};onInit(){this.life&&setTimeout(()=>{this.visible.set(!1)},this.life)}onAfterContentInit(){this.templates?.forEach(e=>{switch(e.getType()){case"container":this._containerTemplate=e.template;break;case"icon":this._iconTemplate=e.template;break;case"closeicon":this._closeIconTemplate=e.template;break}})}close(e){this.visible.set(!1),this.onClose.emit({originalEvent:e})}get dataP(){return this.cn({outlined:this.variant==="outlined",simple:this.variant==="simple",[this.severity]:this.severity,[this.size]:this.size})}static \u0275fac=(()=>{let e;return function(t){return(e||(e=M(n)))(t||n)}})();static \u0275cmp=A({type:n,selectors:[["p-message"]],contentQueries:function(s,t,l){if(s&1&&W(l,be,4)(l,he,4)(l,_e,4)(l,ae,4),s&2){let d;_(d=v())&&(t.containerTemplate=d.first),_(d=v())&&(t.iconTemplate=d.first),_(d=v())&&(t.closeIconTemplate=d.first),_(d=v())&&(t.templates=d)}},hostAttrs:["role","alert","aria-live","polite"],hostVars:5,hostBindings:function(s,t){s&1&&(H(function(){return"p-message-enter-active"}),Q(function(){return"p-message-leave-active"})),s&2&&(r("data-p",t.dataP),g(t.cn(t.cx("root"),t.styleClass)),J("p-message-leave-active",!t.visible()))},inputs:{severity:"severity",text:"text",escape:[2,"escape","escape",k],style:"style",styleClass:"styleClass",closable:[2,"closable","closable",k],icon:"icon",closeIcon:"closeIcon",life:"life",showTransitionOptions:"showTransitionOptions",hideTransitionOptions:"hideTransitionOptions",size:"size",variant:"variant",motionOptions:[1,"motionOptions"]},outputs:{onClose:"onClose"},features:[X([ue,{provide:fe,useExisting:n},{provide:re,useExisting:n}]),j([x]),R],ngContentSelectors:ve,decls:7,vars:12,consts:[["escapeOut",""],[3,"pBind"],[3,"pBind","class"],["pRipple","","type","button",3,"pBind","class"],[4,"ngTemplateOutlet"],[4,"ngTemplateOutlet","ngTemplateOutletContext"],[4,"ngIf","ngIfElse"],[3,"pBind","ngClass"],[3,"pBind","ngClass","innerHTML",4,"ngIf"],[3,"pBind","ngClass","innerHTML"],[3,"pBind","ngClass",4,"ngIf"],["pRipple","","type","button",3,"click","pBind"],[3,"pBind","class","ngClass"],["data-p-icon","times",3,"pBind","class"],["data-p-icon","times",3,"pBind"]],template:function(s,t){s&1&&(q(),f(0,"div",1)(1,"div",1),m(2,we,1,1,"ng-container"),m(3,Ce,1,4,"i",2),m(4,Me,1,4,"ng-container")(5,Ee,5,5),m(6,Pe,4,8,"button",3),b()()),s&2&&(g(t.cx("contentWrapper")),o("pBind",t.ptm("contentWrapper")),r("data-p",t.dataP),c(),g(t.cx("content")),o("pBind",t.ptm("content")),r("data-p",t.dataP),c(),p(t.iconTemplate||t._iconTemplate?2:-1),c(),p(t.icon?3:-1),c(),p(t.containerTemplate||t._containerTemplate?4:5),c(2),p(t.closable?6:-1))},dependencies:[ie,te,se,oe,de,pe,C,x,me],encapsulation:2,changeDetection:0})}return n})(),rn=(()=>{class n{static \u0275fac=function(s){return new(s||n)};static \u0275mod=F({type:n});static \u0275inj=z({imports:[Fe,C,C]})}return n})();export{Fe as a,rn as b};
