import{Ad as q,Cd as O,Dd as U,E as b,Ea as i,Ed as l,F as y,Fa as u,G as I,Ga as h,Ha as D,I as s,K as z,L as E,Oa as N,Ob as P,Qa as S,Qb as R,R as B,Sa as r,Ta as F,Ua as j,Ub as H,Y as v,ab as x,ca as w,da as f,eb as d,fb as L,gb as V,ka as C,la as T,nb as k,pa as A,qa as M,ra as c,va as o,yd as g,zb as _}from"./chunk-2OJBEAHT.js";var $=`
    .p-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: dt('avatar.width');
        height: dt('avatar.height');
        font-size: dt('avatar.font.size');
        background: dt('avatar.background');
        color: dt('avatar.color');
        border-radius: dt('avatar.border.radius');
    }

    .p-avatar-image {
        background: transparent;
    }

    .p-avatar-circle {
        border-radius: 50%;
    }

    .p-avatar-circle img {
        border-radius: 50%;
    }

    .p-avatar-icon {
        font-size: dt('avatar.icon.size');
        width: dt('avatar.icon.size');
        height: dt('avatar.icon.size');
    }

    .p-avatar img {
        width: 100%;
        height: 100%;
    }

    .p-avatar-lg {
        width: dt('avatar.lg.width');
        height: dt('avatar.lg.width');
        font-size: dt('avatar.lg.font.size');
    }

    .p-avatar-lg .p-avatar-icon {
        font-size: dt('avatar.lg.icon.size');
        width: dt('avatar.lg.icon.size');
        height: dt('avatar.lg.icon.size');
    }

    .p-avatar-xl {
        width: dt('avatar.xl.width');
        height: dt('avatar.xl.width');
        font-size: dt('avatar.xl.font.size');
    }

    .p-avatar-xl .p-avatar-icon {
        font-size: dt('avatar.xl.icon.size');
        width: dt('avatar.xl.icon.size');
        height: dt('avatar.xl.icon.size');
    }

    .p-avatar-group {
        display: flex;
        align-items: center;
    }

    .p-avatar-group .p-avatar + .p-avatar {
        margin-inline-start: dt('avatar.group.offset');
    }

    .p-avatar-group .p-avatar {
        border: 2px solid dt('avatar.group.border.color');
    }

    .p-avatar-group .p-avatar-lg + .p-avatar-lg {
        margin-inline-start: dt('avatar.lg.group.offset');
    }

    .p-avatar-group .p-avatar-xl + .p-avatar-xl {
        margin-inline-start: dt('avatar.xl.group.offset');
    }
`;var K=["*"];function Q(t,p){if(t&1&&(u(0,"span",3),L(1),h()),t&2){let a=r();d(a.cx("label")),i("pBind",a.ptm("label")),o("data-p",a.dataP),f(),V(a.label)}}function W(t,p){if(t&1&&D(0,"span",5),t&2){let a=r(2);d(a.icon),i("pBind",a.ptm("icon"))("ngClass",a.cx("icon")),o("data-p",a.dataP)}}function X(t,p){if(t&1&&c(0,W,1,5,"span",4),t&2){let a=r(),n=x(5);i("ngIf",a.icon)("ngIfElse",n)}}function Y(t,p){if(t&1){let a=N();u(0,"img",7),S("error",function(e){z(a);let m=r(2);return E(m.imageError(e))}),h()}if(t&2){let a=r(2);i("pBind",a.ptm("image"))("src",a.image,w),o("aria-label",a.ariaLabel)("data-p",a.dataP)}}function Z(t,p){if(t&1&&c(0,Y,1,4,"img",6),t&2){let a=r();i("ngIf",a.image)}}var tt={root:({instance:t})=>["p-avatar p-component",{"p-avatar-image":t.image!=null,"p-avatar-circle":t.shape==="circle","p-avatar-lg":t.size==="large","p-avatar-xl":t.size==="xlarge"}],label:"p-avatar-label",icon:"p-avatar-icon"},G=(()=>{class t extends q{name="avatar";style=$;classes=tt;static \u0275fac=(()=>{let a;return function(e){return(a||(a=v(t)))(e||t)}})();static \u0275prov=b({token:t,factory:t.\u0275fac})}return t})();var J=new I("AVATAR_INSTANCE"),at=(()=>{class t extends U{componentName="Avatar";$pcAvatar=s(J,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=s(l,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}label;icon;image;size="normal";shape="square";styleClass;ariaLabel;ariaLabelledBy;onImageError=new B;_componentStyle=s(G);imageError(a){this.onImageError.emit(a)}get dataP(){return this.cn({[this.shape]:this.shape,[this.size]:this.size})}static \u0275fac=(()=>{let a;return function(e){return(a||(a=v(t)))(e||t)}})();static \u0275cmp=C({type:t,selectors:[["p-avatar"]],hostVars:5,hostBindings:function(n,e){n&2&&(o("aria-label",e.ariaLabel)("aria-labelledby",e.ariaLabelledBy)("data-p",e.dataP),d(e.cn(e.cx("root"),e.styleClass)))},inputs:{label:"label",icon:"icon",image:"image",size:"size",shape:"shape",styleClass:"styleClass",ariaLabel:"ariaLabel",ariaLabelledBy:"ariaLabelledBy"},outputs:{onImageError:"onImageError"},features:[k([G,{provide:J,useExisting:t},{provide:O,useExisting:t}]),A([l]),M],ngContentSelectors:K,decls:6,vars:2,consts:[["iconTemplate",""],["imageTemplate",""],[3,"pBind","class",4,"ngIf","ngIfElse"],[3,"pBind"],[3,"pBind","class","ngClass",4,"ngIf","ngIfElse"],[3,"pBind","ngClass"],[3,"pBind","src","error",4,"ngIf"],[3,"error","pBind","src"]],template:function(n,e){if(n&1&&(F(),j(0),c(1,Q,2,5,"span",2)(2,X,1,2,"ng-template",null,0,_)(4,Z,1,1,"ng-template",null,1,_)),n&2){let m=x(3);f(),i("ngIf",e.label)("ngIfElse",m)}},dependencies:[H,P,R,g,l],encapsulation:2,changeDetection:0})}return t})(),bt=(()=>{class t{static \u0275fac=function(n){return new(n||t)};static \u0275mod=T({type:t});static \u0275inj=y({imports:[at,g,g]})}return t})();export{at as a,bt as b};
