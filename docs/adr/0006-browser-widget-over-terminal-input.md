# Design-mode interaction in a browser overlay widget, not Pi's terminal input

The user selects elements and provides instructions through a Shadow DOM widget rendered in the browser, not through Pi's terminal input. Rationale: the browser is where the user sees the UI they want to change; the widget naturally accumulates selections (enabling multi-select later); and the submit model (select elements → type instruction → hit Submit) is more natural than switching between two windows. Pi's terminal shows LLM processing results, diffs, and status. The widget is the input surface.

**Consequences:** More client-side code (vanilla DOM + Shadow DOM widget). Pi's terminal input is still available for non-design work. Widget only appears when design mode is active and WS is connected.
