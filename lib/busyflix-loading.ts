export type BusyflixLoadingReason = "boot" | "locale";

export const BUSYFLIX_LOADING_ATTRIBUTE = "data-busyflix-loading";
export const BUSYFLIX_LOADING_STARTED_ATTRIBUTE =
  "data-busyflix-loading-started";
export const BUSYFLIX_BOOT_SEEN_KEY = "busyflix:boot-seen:v1";
export const BUSYFLIX_LOCALE_PENDING_KEY = "busyflix:locale-pending:v1";
export const BUSYFLIX_MINIMUM_VISIBLE_MS = 450;
export const BUSYFLIX_SAFETY_TIMEOUT_MS = 4000;

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

let safetyTimeout: number | undefined;

export function resolveBusyflixInitialReason(
  storage: SessionStorageLike,
): BusyflixLoadingReason | null {
  const localePending =
    storage.getItem(BUSYFLIX_LOCALE_PENDING_KEY) === "1";
  const bootSeen = storage.getItem(BUSYFLIX_BOOT_SEEN_KEY) === "1";

  storage.setItem(BUSYFLIX_BOOT_SEEN_KEY, "1");
  if (localePending) {
    storage.removeItem(BUSYFLIX_LOCALE_PENDING_KEY);
    return "locale";
  }

  return bootSeen ? null : "boot";
}

export function markBusyflixLocalePending(storage: SessionStorageLike) {
  storage.setItem(BUSYFLIX_LOCALE_PENDING_KEY, "1");
}

export function remainingBusyflixLoadingTime(startedAt: number, now: number) {
  return Math.max(0, BUSYFLIX_MINIMUM_VISIBLE_MS - (now - startedAt));
}

export function clearBusyflixLoading() {
  const root = document.documentElement;
  root.removeAttribute(BUSYFLIX_LOADING_ATTRIBUTE);
  root.removeAttribute(BUSYFLIX_LOADING_STARTED_ATTRIBUTE);

  if (safetyTimeout !== undefined) {
    window.clearTimeout(safetyTimeout);
    safetyTimeout = undefined;
  }
}

export function activateBusyflixLoading(reason: BusyflixLoadingReason) {
  const root = document.documentElement;
  root.setAttribute(BUSYFLIX_LOADING_ATTRIBUTE, reason);
  root.setAttribute(BUSYFLIX_LOADING_STARTED_ATTRIBUTE, String(Date.now()));

  if (reason === "locale") {
    try {
      markBusyflixLocalePending(window.sessionStorage);
    } catch {
      // The current document overlay still works when storage is unavailable.
    }
  }

  if (safetyTimeout !== undefined) {
    window.clearTimeout(safetyTimeout);
  }
  safetyTimeout = window.setTimeout(
    clearBusyflixLoading,
    BUSYFLIX_SAFETY_TIMEOUT_MS,
  );
}

export function reloadAfterBusyflixLoadingPaint(
  reload: () => void = () => window.location.reload(),
  schedule: (callback: FrameRequestCallback) => number =
    window.requestAnimationFrame.bind(window),
) {
  schedule(() => {
    schedule(() => reload());
  });
}

const loadingAttribute = JSON.stringify(BUSYFLIX_LOADING_ATTRIBUTE);
const startedAttribute = JSON.stringify(BUSYFLIX_LOADING_STARTED_ATTRIBUTE);
const bootSeenKey = JSON.stringify(BUSYFLIX_BOOT_SEEN_KEY);
const localePendingKey = JSON.stringify(BUSYFLIX_LOCALE_PENDING_KEY);

export const busyflixLoadingInitScript = `(function(){try{var d=document.documentElement,r="boot",n=Date.now();try{var s=sessionStorage,p=s.getItem(${localePendingKey})==="1",b=s.getItem(${bootSeenKey})==="1";s.setItem(${bootSeenKey},"1");if(p){s.removeItem(${localePendingKey});r="locale";}else if(b){r="";}}catch(e){}if(!r){return;}d.setAttribute(${loadingAttribute},r);d.setAttribute(${startedAttribute},String(n));setTimeout(function(){d.removeAttribute(${loadingAttribute});d.removeAttribute(${startedAttribute});},${BUSYFLIX_SAFETY_TIMEOUT_MS});}catch(e){}})();`;
