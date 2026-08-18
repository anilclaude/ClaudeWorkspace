// Contracts served by the cafe service (:4003). One file per module inside
// this folder (menu.ts today; future cafe-suite PRDs — orders, inventory —
// add siblings here), re-exported as a single `cafe` namespace, same
// convention as auth/ and core/.

export * from './menu';
