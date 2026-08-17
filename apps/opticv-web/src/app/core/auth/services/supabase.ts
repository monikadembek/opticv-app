import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
  createClient,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class Supabase {
  private readonly platformId = inject(PLATFORM_ID);

  private supabase!: SupabaseClient;
  #currentUser = signal<User | null>(null);
  #currentSession = signal<Session | null>(null);
  #pendingEmail = signal<string | null>(null);
  #sessionReady = signal<boolean>(false);

  get currentUser() {
    return this.#currentUser.asReadonly();
  }

  get currentSession() {
    return this.#currentSession.asReadonly();
  }

  get sessionReady() {
    return this.#sessionReady.asReadonly();
  }

  get pendingEmail() {
    return this.#pendingEmail.asReadonly();
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.supabase = createClient(
        environment.supabaseUrl,
        environment.supabaseKey,
        // { auth: { flowType: 'pkce' } },
      );
      this.initAuth();
    } else {
      this.#sessionReady.set(true);
    }
  }

  setPendingEmail(email: string | null) {
    this.#pendingEmail.set(email);
  }

  signInWithOtp(userEmail: string) {
    return this.supabase.auth.signInWithOtp({
      email: userEmail,
      options: {
        // set this to false if you do not want the user to be automatically signed up
        shouldCreateUser: true,
      },
    });
  }

  verifyOtp(code: string, email: string) {
    return this.supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: 'email',
    });
  }

  updateEmail(newEmail: string) {
    return this.supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/home` },
    );
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }

  getSession() {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve({ data: { session: null }, error: null });
    }
    return this.supabase.auth.getSession();
  }

  initAuth() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        // handle initial session
        this.#currentSession.set(session);
        this.#currentUser.set(session?.user ? session.user : null);
        this.#pendingEmail.set(null);
        this.#sessionReady.set(true);
        if (!environment.production) {
          console.log(event, session);
        }
      } else if (event === 'SIGNED_IN') {
        // handle sign in event
        this.#currentSession.set(session);
        this.#currentUser.set(session?.user ? session.user : null);
        this.#pendingEmail.set(null);
        if (!environment.production) {
          console.log(event, session);
        }
      } else if (event === 'SIGNED_OUT') {
        if (!environment.production) {
          console.log(event, session);
        }
        this.#currentSession.set(null);
        this.#currentUser.set(null);
      }
    });
    // call unsubscribe to remove the callback
    // data.subscription.unsubscribe();
  }
}
