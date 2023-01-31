import type {
  Analytics, FirebaseApp, Auth, ActionCodeSettings, User, UserCredential,
  AuthProvider, PopupRedirectResolver, AuthCredential, ErrorFn, CompleteFn,
  NextOrObserver, OAuthCredential, Provider,
} from "@/pluginWrappers/firebase";

// Import store
import useUserStore from "@/stores/user";
import displayConsole from "@/helpers/displayConsole";

interface UpdateProfilePayload {
  displayName?: string | null;
  photoURL?: string | null;
}

interface AnalyticsModule {
  "getAnalytics": (app?: FirebaseApp | undefined) => Analytics;
  "logEvent": (analytics: Analytics, logType: string, logObject: { description: string; fatal: boolean; }) => void;
}

const dataPromises = {
  authModule: null as Promise<any> | null,
  firebaseApp: null as Promise<FirebaseApp> | null,
  analyticsModule: null as Promise<AnalyticsModule> | null,
};

/**
 * Loads the firebase app module and initiazez firebase with firebase config
 *
 * @returns A Promise to the firebase app instance
 */
function initializeApp(): Promise<FirebaseApp> {
  const publicConfig = useRuntimeConfig().public;
  return new Promise((resolve) => {
    EventBus.$on("resolveFirebase", () => {
      import("firebase/app").then((appModule) => {
        const firebaseConfig = {
          apiKey: publicConfig.apiKey,
          authDomain: publicConfig.authDomain,
          databaseURL: publicConfig.databaseURL,
          projectId: publicConfig.projectId,
          storageBucket: publicConfig.storageBucket,
          messagingSenderId: publicConfig.messagingSenderId,
          appId: publicConfig.appId,
          measurementId: publicConfig.measurementId,
        };
        const app = appModule.initializeApp(firebaseConfig);
        displayConsole("Firebase resolved", null, "firebaseAuth/initializeApp");
        resolve(app);
      });
    }, true);
  });
}

/**
 * Makes firebase calls active i.e all calls will only start resolving
 * after this function is called
 * * Also the function isn't expected to be called more than once
 */
export const makeFirebaseActive = () => {
  if (dataPromises.firebaseApp === null) dataPromises.firebaseApp = initializeApp();
  EventBus.$emit("resolveFirebase");
};

/**
 * Dynamically Loads the firebase auth module returns a
 * promise that resolves into auth module
 *
 * @returns {Promise<any>} A Promise to load firebase auth module
 */
async function loadFirebaseAuth(): Promise<any> {
  await dataPromises.firebaseApp;
  const authModule = await import("firebase/auth");
  return authModule;
}

/**
 * Dynamically loads firebase analytics and returns a promise to analytics module
 * @returns {Promise<AnalyticsModule>} A Promise to loads firebase analytics
 */
function loadFirebaseAnalytics(): Promise<AnalyticsModule> {
  return new Promise((resolve) => {
    EventBus.$on("resolveAnalytics", async () => {
      await dataPromises.firebaseApp;
      const module = await import("firebase/analytics");
      const analyticsModule = (({ getAnalytics, logEvent }) => ({ getAnalytics, logEvent }))(module);

      displayConsole("Anaylytics resolved", null, "firebaseAuth/loadFirebaseAnalytics");
      resolve(analyticsModule);
    });
  });
}

/**
 * Makes firebase calls active i.e all calls will only start resolving
 * after this function is called
 * * Also the function isn't expected to be called more than once
 */
export const makeAnalyticsActive = () => {
  if (dataPromises.analyticsModule === null) dataPromises.analyticsModule = loadFirebaseAnalytics();
  EventBus.$emit("resolveAnalytics");
};

/**
 * Returns a promise which resolves into firebase auth module
 * @returns {Promise<any>} A Promise which resolves into firebase auth module
 */
async function getAuthModule(): Promise<any> {
  if (dataPromises.firebaseApp === null) {
    dataPromises.firebaseApp = initializeApp();
    await dataPromises.firebaseApp;
  }

  if (dataPromises.authModule !== null) {
    return dataPromises.authModule;
  }

  dataPromises.authModule = loadFirebaseAuth();
  return getAuthModule();
}

/**
 * Returns a promise which resolves into firebase analytics module
 * @returns {Promise<AnalyticsModule>} A Promise which resolves into firebase auth module
 */
async function getAnalyticsModule(): Promise<AnalyticsModule> {
  if (dataPromises.firebaseApp === null) {
    dataPromises.firebaseApp = initializeApp();
    await dataPromises.firebaseApp;
  }
  if (dataPromises.analyticsModule !== null) {
    return dataPromises.analyticsModule;
  }

  dataPromises.analyticsModule = loadFirebaseAnalytics();
  return getAnalyticsModule();
}

/**
 * Returns the Auth instance associated with the provided {@link @firebase/app#FirebaseApp}.
 * If no instance exists, initializes an Auth instance with platform-specific default dependencies.
 *
 * @param {FirebaseApp} - The Firebase App.
 * @returns {Promise<Auth>} A Promise to the firebase auth module
 *
 */
export async function getAuth(app?: FirebaseApp): Promise<Auth> {
  const authModule = await getAuthModule();
  return authModule.getAuth(app);
}

/**
 *
 * @param {string} provider the name of provider {google, facebook, github}
 * @returns this function returns AuthProvider/Credential instance
 */
export async function getProvider(provider: Provider): Promise<AuthProvider> {
  const authModule = await getAuthModule();
  switch (provider) {
    case "google": return new authModule.GoogleAuthProvider();
    case "facebook": return new authModule.FacebookAuthProvider();
    case "github": return new authModule.GithubAuthProvider();
    default: throw Error(`Unknown provider '${provider}'`);
  }
}

/**
 *
 * @param {Provider} provider the name of provider {google, facebook, github}
 * @param {string} accessToken return by new priveder
 * @returns this function returns AuthProvider/Credential instance
 */
export async function getCredential(provider: Provider, accessToken: string): Promise<OAuthCredential> {
  const authModule = await getAuthModule();
  switch (provider) {
    case "google": return authModule.GoogleAuthProvider.credential(accessToken);
    case "facebook": return authModule.FacebookAuthProvider.credential(accessToken);
    case "github": return authModule.GithubAuthProvider.credential(accessToken);
    default: throw Error(`Unknown provider '${provider}'`);
  }
}

let userLoaded = false;

/**
 * Function gets the user data asynchronously
 *
 * @returns {User | null} - user data
 */
export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolveUser, rejectUser) => {
    if (userLoaded) {
      getAuth().then((auth) => {
        resolveUser(auth.currentUser);
      });
      return;
    }
    getAuth().then((auth) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        userLoaded = true;
        unsubscribe();
        resolveUser(user);
      }, rejectUser);
    });
  });
}

/**
 * Function gets the user token
 *
 * @returns {Promise<string>} - user token
 */
export async function getUserToken(): Promise<string> {
  const authModule = await getAuthModule();
  const userStore = useUserStore();

  if (userStore.getAuthenticatedState) {
    await authModule?.getAuth()?.currentUser?.getIdToken();
  }
  return userStore.getUserToken;
}
/**
 * Function get the user id
 *
 *  @returns {Promise<string>} - return the user id
 */
export async function getUserId(): Promise<string | undefined> {
  const userStore = useUserStore();

  const authModule = await getAuthModule();
  if (userStore.getAuthenticatedState) {
    return authModule.getAuth()?.currentUser?.uid;
  }
  return userStore.getUserId;
}

/**
 *
 * @logs production events in google analytics
 * refer : https://firebase.google.com/docs/analytics/events?platform=web#web-version-9_1
 * Refer the above link to know more about the syntax of firebase version 9
*/
export function analyticsLogger(logType: string, logObject: any) {
  // Logs to be sent only in production environment
  if (process.env.NODE_ENV !== "production") return;

  getAnalyticsModule().then((analyticsModule) => {
    analyticsModule.logEvent(analyticsModule.getAnalytics(), logType, logObject);
  }).catch((err) => {
    console.log("Analytics couldn't be loaded", err);
  });
}

// Dummy Functionss for firebase auth, these hold the call while firebase auth loads in background

export async function sendPasswordResetEmail(email: string, actionCodeSettings?: ActionCodeSettings): Promise<void> {
  const authModule = await getAuthModule();
  return authModule.sendPasswordResetEmail(authModule.getAuth(), email, actionCodeSettings);
}

export async function fetchSignInMethodsForEmail(email: string): Promise<string[]> {
  const authModule = await getAuthModule();
  return authModule.fetchSignInMethodsForEmail(authModule.getAuth(), email);
}

export async function signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
  const authModule = await getAuthModule();
  return authModule.signInWithEmailAndPassword(authModule.getAuth(), email, password);
}

export async function createUserWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
  const authModule = await getAuthModule();
  return authModule.createUserWithEmailAndPassword(authModule.getAuth(), email, password);
}

export async function sendEmailVerification(user: User, actionCodeSettings?: ActionCodeSettings | null): Promise<void> {
  const authModule = await getAuthModule();
  return authModule.sendEmailVerification(user, actionCodeSettings);
}

export async function updateProfile(user: User, payload: UpdateProfilePayload): Promise<void> {
  const authModule = await getAuthModule();
  return authModule.updateProfile(user, payload);
}

export async function updateEmail(user: User, newEmail: string): Promise<void> {
  const authModule = await getAuthModule();
  return authModule.updateEmail(user, newEmail);
}

export async function signInWithPopup(provider: Provider, resolver?: PopupRedirectResolver): Promise<UserCredential> {
  const authModule = await getAuthModule();
  const provid = await getProvider(provider);
  return authModule.signInWithPopup(authModule.getAuth(), provid, resolver);
}

export async function signInWithRedirect(provider: Provider, resolver?: PopupRedirectResolver): Promise<never> {
  const authModule = await getAuthModule();
  const provid = await getProvider(provider);
  return authModule.signInWithRedirect(authModule.getAuth(), provid, resolver) as never;
}

export async function signOut(): Promise<never> {
  const authModule = await getAuthModule();
  return authModule.signOut(authModule.getAuth()) as never;
}

export async function linkWithCredential(user: User, credential: AuthCredential): Promise<UserCredential> {
  const authModule = await getAuthModule();
  return authModule.linkWithCredential(user, credential);
}

export async function linkWithAccessToken(user: User, provider: Provider, accessToken: string): Promise<UserCredential> {
  const authModule = await getAuthModule();
  const credential = await getCredential(provider, accessToken);
  return authModule.linkWithCredential(user, credential);
}

export async function linkWithRedirect(user: User, provider: AuthProvider, resolver?: PopupRedirectResolver): Promise<never> {
  const authModule = await getAuthModule();
  return authModule.linkWithRedirect(user, provider, resolver) as never;
}

export async function linkWithPopup(user: User, provider: AuthProvider, resolver?: PopupRedirectResolver): Promise<never> {
  const authModule = await getAuthModule();
  return authModule.linkWithPopup(user, provider, resolver) as never;
}

export async function getRedirectResult(resolver?: PopupRedirectResolver): Promise<UserCredential | null> {
  const authModule = await getAuthModule();
  return authModule.getRedirectResult(authModule.getAuth(), resolver);
}

export async function signInWithCredential(credential: AuthCredential): Promise<UserCredential> {
  const authModule = await getAuthModule();
  return authModule.signInWithCredential(authModule.getAuth(), credential);
}

export async function signInWithAccessToken(provider: Provider, accessToken: string): Promise<UserCredential> {
  const authModule = await getAuthModule();
  const credential = await getCredential(provider, accessToken);
  return authModule.signInWithCredential(authModule.getAuth(), credential);
}

export function onAuthStateChanged(nextOrObserver: NextOrObserver<User>, error?: ErrorFn, completed?: CompleteFn) {
  getAuthModule().then((authModule) => {
    // ! TODO return unsubscribe function back
    authModule.onAuthStateChanged(authModule.getAuth(), nextOrObserver, error, completed);
  });
}
