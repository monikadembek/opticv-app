import{b as re}from"./chunk-FGMWAO5O.js";import{a as ie,b as oe}from"./chunk-XDOLM6TY.js";import"./chunk-3SLCF7JT.js";import"./chunk-PRQ56CCS.js";import{b as H,e as $,f as J,h as K,i as Q,j as U,m as X,n as Z,q as ee,t as fe,u as ce}from"./chunk-6HGQSLTQ.js";import"./chunk-UWOJQS63.js";import{a as G}from"./chunk-NWGE3MIH.js";import{Ad as te,Cd as ne,Dd as ae,E,Ea as C,Ed as h,F as P,Fa as l,Fd as le,G as O,Ga as i,Ha as I,I as r,K as x,L as M,Oa as D,Qa as N,Sa as w,Sd as se,Ta as T,Td as pe,Ua as B,Ub as Y,V as _,Vd as de,Wd as ue,Y as y,ab as m,da as s,eb as V,fb as o,hb as j,jb as z,ka as b,kb as A,la as F,lb as W,lc as R,nb as q,pa as L,qa as k,ya as c,yd as g,za as u}from"./chunk-2OJBEAHT.js";import"./chunk-ZGVHDELW.js";var me=`
    .p-floatlabel {
        display: block;
        position: relative;
    }

    .p-floatlabel label {
        position: absolute;
        pointer-events: none;
        top: 50%;
        transform: translateY(-50%);
        transition-property: all;
        transition-timing-function: ease;
        line-height: 1;
        font-weight: dt('floatlabel.font.weight');
        inset-inline-start: dt('floatlabel.position.x');
        color: dt('floatlabel.color');
        transition-duration: dt('floatlabel.transition.duration');
    }

    .p-floatlabel:has(.p-textarea) label {
        top: dt('floatlabel.position.y');
        transform: translateY(0);
    }

    .p-floatlabel:has(.p-inputicon:first-child) label {
        inset-inline-start: calc((dt('form.field.padding.x') * 2) + dt('icon.size'));
    }

    .p-floatlabel:has(input:focus) label,
    .p-floatlabel:has(input.p-filled) label,
    .p-floatlabel:has(input:-webkit-autofill) label,
    .p-floatlabel:has(textarea:focus) label,
    .p-floatlabel:has(textarea.p-filled) label,
    .p-floatlabel:has(.p-inputwrapper-focus) label,
    .p-floatlabel:has(.p-inputwrapper-filled) label,
    .p-floatlabel:has(input[placeholder]) label,
    .p-floatlabel:has(textarea[placeholder]) label {
        top: dt('floatlabel.over.active.top');
        transform: translateY(0);
        font-size: dt('floatlabel.active.font.size');
        font-weight: dt('floatlabel.active.font.weight');
    }

    .p-floatlabel:has(input.p-filled) label,
    .p-floatlabel:has(textarea.p-filled) label,
    .p-floatlabel:has(.p-inputwrapper-filled) label {
        color: dt('floatlabel.active.color');
    }

    .p-floatlabel:has(input:focus) label,
    .p-floatlabel:has(input:-webkit-autofill) label,
    .p-floatlabel:has(textarea:focus) label,
    .p-floatlabel:has(.p-inputwrapper-focus) label {
        color: dt('floatlabel.focus.color');
    }

    .p-floatlabel-in .p-inputtext,
    .p-floatlabel-in .p-textarea,
    .p-floatlabel-in .p-select-label,
    .p-floatlabel-in .p-multiselect-label,
    .p-floatlabel-in .p-multiselect-label:has(.p-chip),
    .p-floatlabel-in .p-autocomplete-input-multiple,
    .p-floatlabel-in .p-cascadeselect-label,
    .p-floatlabel-in .p-treeselect-label {
        padding-block-start: dt('floatlabel.in.input.padding.top');
        padding-block-end: dt('floatlabel.in.input.padding.bottom');
    }

    .p-floatlabel-in:has(input:focus) label,
    .p-floatlabel-in:has(input.p-filled) label,
    .p-floatlabel-in:has(input:-webkit-autofill) label,
    .p-floatlabel-in:has(textarea:focus) label,
    .p-floatlabel-in:has(textarea.p-filled) label,
    .p-floatlabel-in:has(.p-inputwrapper-focus) label,
    .p-floatlabel-in:has(.p-inputwrapper-filled) label,
    .p-floatlabel-in:has(input[placeholder]) label,
    .p-floatlabel-in:has(textarea[placeholder]) label {
        top: dt('floatlabel.in.active.top');
    }

    .p-floatlabel-on:has(input:focus) label,
    .p-floatlabel-on:has(input.p-filled) label,
    .p-floatlabel-on:has(input:-webkit-autofill) label,
    .p-floatlabel-on:has(textarea:focus) label,
    .p-floatlabel-on:has(textarea.p-filled) label,
    .p-floatlabel-on:has(.p-inputwrapper-focus) label,
    .p-floatlabel-on:has(.p-inputwrapper-filled) label,
    .p-floatlabel-on:has(input[placeholder]) label,
    .p-floatlabel-on:has(textarea[placeholder]) label {
        top: 0;
        transform: translateY(-50%);
        border-radius: dt('floatlabel.on.border.radius');
        background: dt('floatlabel.on.active.background');
        padding: dt('floatlabel.on.active.padding');
    }

    .p-floatlabel:has([class^='p-'][class$='-fluid']) {
        width: 100%;
    }

    .p-floatlabel:has(.p-invalid) label {
        color: dt('floatlabel.invalid.color');
    }
`;var xe=["*"],Me=`
    ${me}

    /* For PrimeNG */
    .p-floatlabel:has(.ng-invalid.ng-dirty) label {
        color: dt('floatlabel.invalid.color');
    }
`,_e={root:({instance:e})=>["p-floatlabel",{"p-floatlabel-over":e.variant==="over","p-floatlabel-on":e.variant==="on","p-floatlabel-in":e.variant==="in"}]},be=(()=>{class e extends te{name="floatlabel";style=Me;classes=_e;static \u0275fac=(()=>{let t;return function(n){return(t||(t=y(e)))(n||e)}})();static \u0275prov=E({token:e,factory:e.\u0275fac})}return e})();var ge=new O("FLOATLABEL_INSTANCE"),S=(()=>{class e extends ae{componentName="FloatLabel";_componentStyle=r(be);$pcFloatLabel=r(ge,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=r(h,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}variant="over";static \u0275fac=(()=>{let t;return function(n){return(t||(t=y(e)))(n||e)}})();static \u0275cmp=b({type:e,selectors:[["p-floatlabel"],["p-floatLabel"],["p-float-label"]],hostVars:2,hostBindings:function(a,n){a&2&&V(n.cx("root"))},inputs:{variant:"variant"},features:[q([be,{provide:ge,useExisting:e},{provide:ne,useExisting:e}]),L([h]),k],ngContentSelectors:xe,decls:1,vars:0,template:function(a,n){a&1&&(T(),B(0))},dependencies:[Y,g,le],encapsulation:2,changeDetection:0})}return e})(),he=(()=>{class e{static \u0275fac=function(a){return new(a||e)};static \u0275mod=F({type:e});static \u0275inj=P({imports:[S,g,g]})}return e})();function Ce(e,v){e&1&&(l(0,"p-message",22),o(1,"Email is required."),i())}function we(e,v){e&1&&(l(0,"p-message",22),o(1,"Please enter a valid email address."),i())}function Se(e,v){if(e&1&&(c(0,Ce,2,0,"p-message",22),c(1,we,2,0,"p-message",22)),e&2){w();let t=m(18);u(t.hasError("required")?0:-1),s(),u(t.hasError("email")?1:-1)}}function Ee(e,v){if(e&1&&(l(0,"p-message",17),o(1),i()),e&2){let t=w();s(),j(" ",t.errorMessage()," ")}}var lt=(()=>{class e{supabase=r(G);router=r(R);email="";errorMessage=_("");isSubmitting=_(!1);async onSubmit(t){this.errorMessage.set("");let{email:a}=t.form.value;if(t.valid&&a.length>0){this.isSubmitting.set(!0);let{error:n}=await this.supabase.signInWithOtp(a);n||(ue.capture("supabase_signinwithotp_executed",{page:"login"}),this.supabase.setPendingEmail(a),this.router.navigate(["/verify"])),n&&(console.log(n),this.errorMessage.set("Error during sign in process"),this.isSubmitting.set(!1))}}static \u0275fac=function(a){return new(a||e)};static \u0275cmp=b({type:e,selectors:[["app-login"]],decls:33,vars:6,consts:[["loginForm","ngForm"],["emailInput","ngModel"],[1,"auth-container"],[1,"auth-card"],[1,"auth-brand"],[1,"brand-logo"],[1,"auth-content"],[1,"auth-header"],[1,"auth-title"],[1,"auth-subtitle"],[1,"auth-subtitle","mt-2!"],[1,"auth-form",3,"ngSubmit"],[1,"field-wrapper"],["pInputText","","type","email","id","email","name","email","required","","email","",1,"auth-input",3,"ngModelChange","ngModel","invalid"],["for","email"],["pButton","","type","submit",1,"auth-submit-btn",3,"loading","disabled"],["pButtonLabel",""],["severity","error","size","small","variant","simple",1,"auth-error"],[1,"auth-note"],[1,"pi","pi-lock","auth-note-icon"],[1,"auth-footer-link"],["href","https://opticv.net","target","_blank","rel","noopener"],["severity","error","size","small","variant","simple"]],template:function(a,n){if(a&1){let d=D();l(0,"div",2)(1,"div",3)(2,"div",4)(3,"span",5),o(4,"OptiCV"),i()(),l(5,"div",6)(6,"div",7)(7,"h1",8),o(8,"Welcome"),i(),l(9,"p",9),o(10," Enter your email and we'll send you a one-time 6-digit sign-in code, no password needed. "),i(),l(11,"p",10),o(12," In case of first time login you will receive a link to sign in instead of code. "),i()(),l(13,"form",11,0),N("ngSubmit",function(){x(d);let f=m(14);return M(n.onSubmit(f))}),l(15,"div",12)(16,"p-floatlabel")(17,"input",13,1),W("ngModelChange",function(f){return x(d),A(n.email,f)||(n.email=f),M(f)}),i(),l(19,"label",14),o(20,"Email address"),i()(),c(21,Se,2,2),i(),l(22,"button",15)(23,"span",16),o(24,"Send sign-in code"),i()()(),c(25,Ee,2,1,"p-message",17),l(26,"p",18),I(27,"span",19),o(28," Secure, passwordless sign-in via email "),i()()(),l(29,"p",20),o(30," New here? "),l(31,"a",21),o(32,"Learn about OptiCV"),i()()()}if(a&2){let d=m(14),p=m(18);s(17),z("ngModel",n.email),C("invalid",p.invalid&&(p.touched||d.submitted)),s(4),u(p.invalid&&(p.touched||d.submitted)?21:-1),s(),C("loading",n.isSubmitting())("disabled",n.isSubmitting()),s(3),u(n.errorMessage()?25:-1)}},dependencies:[oe,ie,re,de,pe,se,ce,fe,he,S,ee,U,H,$,J,X,Z,Q,K],styles:[".auth-container[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 145px);padding:2rem 1rem;background:linear-gradient(135deg,#f0fdf4,#ecfdf5,#f8fffd)}.auth-card[_ngcontent-%COMP%]{width:100%;max-width:420px;background:#fff;border-radius:16px;box-shadow:0 1px 3px #0000000f,0 8px 32px #05966914;overflow:hidden}.auth-brand[_ngcontent-%COMP%]{background:linear-gradient(135deg,#059669,#10b981);padding:1.75rem 2rem;text-align:center}.brand-logo[_ngcontent-%COMP%]{font-family:Montserrat,sans-serif;font-size:1.75rem;font-weight:700;color:#fff;letter-spacing:-.5px}.brand-accent[_ngcontent-%COMP%]{color:#d7e506}.auth-content[_ngcontent-%COMP%]{padding:2rem 2rem 2.25rem}.auth-header[_ngcontent-%COMP%]{margin-bottom:2.25rem;text-align:center}.auth-title[_ngcontent-%COMP%]{font-family:Montserrat,sans-serif;font-size:1.4rem;font-weight:700;color:#1a2e22;margin:0 0 .5rem}.auth-subtitle[_ngcontent-%COMP%]{font-size:.9rem;color:#71717b;line-height:1.55;margin:0}.auth-form[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:1.25rem}.field-wrapper[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.375rem}.auth-input[_ngcontent-%COMP%]{width:100%}.auth-submit-btn[_ngcontent-%COMP%]{width:100%;justify-content:center}.auth-error[_ngcontent-%COMP%]{display:flex;justify-content:center;margin-top:1rem}.auth-note[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:center;gap:.375rem;margin-top:1.5rem;font-size:.78rem;color:#a1a1aa}.auth-note-icon[_ngcontent-%COMP%]{font-size:.7rem}.auth-footer-link[_ngcontent-%COMP%]{margin-top:1.5rem;font-size:.875rem;color:#71717b;text-align:center}.auth-footer-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:#059669;font-weight:500}.auth-footer-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover{text-decoration:underline}"],changeDetection:0})}return e})();export{lt as Login};
