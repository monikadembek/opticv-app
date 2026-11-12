import './polyfills.server.mjs';
import{a as ie,d as le}from"./chunk-VIVK5MU4.mjs";import{a as ge,b as he}from"./chunk-C5HEO3DR.mjs";import{a as S,b as oe}from"./chunk-D2WUS647.mjs";import"./chunk-FC3H6447.mjs";import"./chunk-22YTBM24.mjs";import{b as re,e as se,f as pe,h as de,i as fe,j as ce,m as ue,n as me,q as be,t as ve,u as xe}from"./chunk-BCLLF333.mjs";import"./chunk-DA427ILG.mjs";import{a as ne}from"./chunk-PBM6N4AR.mjs";import{Ba as Z,Ca as ee,Ea as te,Ga as ae,ha as h,ja as J,la as K,ma as Q,na as v,oa as X}from"./chunk-ZWZQXCGP.mjs";import{$a as T,Ab as W,E,F as L,G as O,I as r,La as c,M,Ma as u,N as _,Ra as g,Sa as a,Ta as l,Ua as D,Wc as Y,X as y,Zc as H,_ as C,_c as $,bb as B,db as w,eb as A,fb as V,ja as k,ka as s,nb as m,rb as j,sb as i,ta as b,ua as F,ub as z,wb as R,wc as G,xb as U,ya as I,yb as q,za as N}from"./chunk-JVS5N7EF.mjs";import"./chunk-JS3E2DIL.mjs";var Me=`
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
`;var Se=["*"],Pe=`
    ${Me}

    /* For PrimeNG */
    .p-floatlabel:has(.ng-invalid.ng-dirty) label {
        color: dt('floatlabel.invalid.color');
    }
`,Ee={root:({instance:e})=>["p-floatlabel",{"p-floatlabel-over":e.variant==="over","p-floatlabel-on":e.variant==="on","p-floatlabel-in":e.variant==="in"}]},_e=(()=>{class e extends J{name="floatlabel";style=Pe;classes=Ee;static \u0275fac=(()=>{let n;return function(t){return(n||(n=C(e)))(t||e)}})();static \u0275prov=E({token:e,factory:e.\u0275fac})}return e})();var ye=new O("FLOATLABEL_INSTANCE"),P=(()=>{class e extends Q{componentName="FloatLabel";_componentStyle=r(_e);$pcFloatLabel=r(ye,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=r(v,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}variant="over";static \u0275fac=(()=>{let n;return function(t){return(n||(n=C(e)))(t||e)}})();static \u0275cmp=b({type:e,selectors:[["p-floatlabel"],["p-floatLabel"],["p-float-label"]],hostVars:2,hostBindings:function(o,t){o&2&&j(t.cx("root"))},inputs:{variant:"variant"},features:[W([_e,{provide:ye,useExisting:e},{provide:K,useExisting:e}]),I([v]),N],ngContentSelectors:Se,decls:1,vars:0,template:function(o,t){o&1&&(A(),V(0))},dependencies:[G,h,X],encapsulation:2,changeDetection:0})}return e})(),Ce=(()=>{class e{static \u0275fac=function(o){return new(o||e)};static \u0275mod=F({type:e});static \u0275inj=L({imports:[P,h,h]})}return e})();function Oe(e,x){e&1&&(a(0,"p-message",25),i(1,"Email is required."),l())}function ke(e,x){e&1&&(a(0,"p-message",25),i(1,"Please enter a valid email address."),l())}function Fe(e,x){if(e&1&&(c(0,Oe,2,0,"p-message",25),c(1,ke,2,0,"p-message",25)),e&2){w();let n=m(18);u(n.hasError("required")?0:-1),s(),u(n.hasError("email")?1:-1)}}function Ie(e,x){if(e&1&&(a(0,"p-message",20),i(1),l()),e&2){let n=w();s(),z(" ",n.errorMessage()," ")}}var ct=(()=>{class e{supabase=r(ae);router=r(H);route=r(Y);returnUrl=oe(this.route.snapshot.queryParamMap.get(S));landingPageUrl=ie;email="";errorMessage=y("");isSubmitting=y(!1);async onSubmit(n){this.errorMessage.set("");let{email:o}=n.form.value;if(n.valid&&o.length>0){this.isSubmitting.set(!0);let{error:t}=await this.supabase.signInWithOtp(o);t||(ne.capture("supabase_signinwithotp_executed",{page:"login"}),this.supabase.setPendingEmail(o),this.returnUrl?this.router.navigate(["/verify"],{queryParams:{[S]:this.returnUrl}}):this.router.navigate(["/verify"])),t&&(console.log(t),this.errorMessage.set("Error during sign in process"),this.isSubmitting.set(!1))}}static \u0275fac=function(o){return new(o||e)};static \u0275cmp=b({type:e,selectors:[["app-login"]],decls:41,vars:7,consts:[["loginForm","ngForm"],["emailInput","ngModel"],[1,"auth-container"],[1,"auth-card"],[1,"auth-brand"],[1,"brand-logo"],[1,"auth-content"],[1,"auth-header"],[1,"auth-title"],[1,"auth-subtitle"],[1,"auth-subtitle","mt-2!"],[1,"auth-form",3,"ngSubmit"],[1,"field-wrapper"],["pInputText","","type","email","id","email","name","email","required","","email","",1,"auth-input",3,"ngModelChange","ngModel","invalid"],["for","email"],["pButton","","type","submit",1,"auth-submit-btn",3,"loading","disabled"],["pButtonLabel",""],[1,"auth-legal"],["routerLink","/terms-of-use","target","_blank","rel","noopener"],["routerLink","/privacy-policy","target","_blank","rel","noopener"],["severity","error","size","small","variant","simple",1,"auth-error"],[1,"auth-note"],[1,"pi","pi-lock","auth-note-icon"],[1,"auth-footer-link"],["target","_blank","rel","noopener",3,"href"],["severity","error","size","small","variant","simple"]],template:function(o,t){if(o&1){let d=T();a(0,"div",2)(1,"div",3)(2,"div",4)(3,"span",5),i(4,"OptiCV"),l()(),a(5,"div",6)(6,"div",7)(7,"h1",8),i(8,"Welcome"),l(),a(9,"p",9),i(10," Enter your email and we'll send you a one-time 6-digit sign-in code, no password needed. "),l(),a(11,"p",10),i(12," In case of first time login you will receive a link to sign in instead of code. "),l()(),a(13,"form",11,0),B("ngSubmit",function(){M(d);let f=m(14);return _(t.onSubmit(f))}),a(15,"div",12)(16,"p-floatlabel")(17,"input",13,1),q("ngModelChange",function(f){return M(d),U(t.email,f)||(t.email=f),_(f)}),l(),a(19,"label",14),i(20,"Email address"),l()(),c(21,Fe,2,2),l(),a(22,"button",15)(23,"span",16),i(24,"Send sign-in code"),l()(),a(25,"p",17),i(26," By continuing, you agree to our "),a(27,"a",18),i(28,"Terms of Use"),l(),i(29," and acknowledge our "),a(30,"a",19),i(31,"Privacy Policy"),l(),i(32,". "),l()(),c(33,Ie,2,1,"p-message",20),a(34,"p",21),D(35,"span",22),i(36," Secure, passwordless sign-in via email "),l()()(),a(37,"p",23),i(38," New here? "),a(39,"a",24),i(40,"Learn about OptiCV"),l()()()}if(o&2){let d=m(14),p=m(18);s(17),R("ngModel",t.email),g("invalid",p.invalid&&(p.touched||d.submitted)),s(4),u(p.invalid&&(p.touched||d.submitted)?21:-1),s(),g("loading",t.isSubmitting())("disabled",t.isSubmitting()),s(11),u(t.errorMessage()?33:-1),s(6),g("href",t.landingPageUrl,k)}},dependencies:[he,ge,le,te,ee,Z,xe,ve,Ce,P,be,ce,re,se,pe,ue,me,fe,de,$],styles:[".auth-container[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 145px);padding:2rem 1rem;background:linear-gradient(135deg,#f0fdf4,#ecfdf5,#f8fffd)}.auth-card[_ngcontent-%COMP%]{width:100%;max-width:420px;background:#fff;border-radius:16px;box-shadow:0 1px 3px #0000000f,0 8px 32px #05966914;overflow:hidden}.auth-brand[_ngcontent-%COMP%]{background:linear-gradient(135deg,#059669,#10b981);padding:1.75rem 2rem;text-align:center}.brand-logo[_ngcontent-%COMP%]{font-family:Montserrat,sans-serif;font-size:1.75rem;font-weight:700;color:#fff;letter-spacing:-.5px}.brand-accent[_ngcontent-%COMP%]{color:#d7e506}.auth-content[_ngcontent-%COMP%]{padding:2rem 2rem 2.25rem}.auth-header[_ngcontent-%COMP%]{margin-bottom:2.25rem;text-align:center}.auth-title[_ngcontent-%COMP%]{font-family:Montserrat,sans-serif;font-size:1.4rem;font-weight:700;color:#1a2e22;margin:0 0 .5rem}.auth-subtitle[_ngcontent-%COMP%]{font-size:.9rem;color:#71717b;line-height:1.55;margin:0}.auth-form[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:1.25rem}.field-wrapper[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.375rem}.auth-input[_ngcontent-%COMP%]{width:100%}.auth-submit-btn[_ngcontent-%COMP%]{width:100%;justify-content:center}.auth-error[_ngcontent-%COMP%]{display:flex;justify-content:center;margin-top:1rem}.auth-note[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:center;gap:.375rem;margin-top:1.5rem;font-size:.78rem;color:#a1a1aa}.auth-note-icon[_ngcontent-%COMP%]{font-size:.7rem}.auth-footer-link[_ngcontent-%COMP%]{margin-top:1.5rem;font-size:.875rem;color:#71717b;text-align:center}.auth-footer-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:#059669;font-weight:500}.auth-footer-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover{text-decoration:underline}.auth-legal[_ngcontent-%COMP%]{font-size:.8rem;color:#71717b;line-height:1.5;text-align:center;margin:0}.auth-legal[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:#047857}.auth-legal[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover{text-decoration:underline;text-underline-offset:2px}"],changeDetection:0})}return e})();export{ct as Login};
