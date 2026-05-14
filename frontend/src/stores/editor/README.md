# Editor Store Ownership

Zustand stores:
- document scene state;
- active map/session state;
- viewport state;
- selection state;
- undo/redo history;
- persisted editor settings.

React local state may store:
- DOM refs;
- pointer gesture sessions;
- temporary keyboard state;
- image natural dimensions;
- RAF handles;
- data that must not trigger global subscribers.

Backend persists:
- canonical Scene JSON only.
