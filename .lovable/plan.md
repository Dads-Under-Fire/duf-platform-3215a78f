

## Changes to `src/pages/CommunicationShield.tsx`

### 1. Add instructional strip below mode label

A small horizontal strip with the flow steps, styled subtly:

```
Directions: Paste a message → Choose how to respond → Copy the court-safe reply
```

Positioned directly after the mode label bar. Uses `text-xs text-muted-foreground` with arrow separators in `text-primary`. Always visible, not closable.

### 2. Move "Start Over" to the top-right of the header area

Remove the "Start Over" button from the bottom controls section (lines 359-366). Add it to the instructional strip row, aligned to the right, using a `RefreshCw` icon + "Start Over" text in `text-primary`. Only visible when `step !== "input"`.

### 3. Update `handleStartOver` to auto-focus the input

Add a `useRef` for the message input field. In `handleStartOver`, after resetting all state, call `inputRef.current?.focus()` to place the cursor in the input.

### File: `src/pages/CommunicationShield.tsx`

- Add `import { useRef }` 
- Create `const inputRef = useRef<HTMLInputElement>(null)`
- Update `handleStartOver` to call `inputRef.current?.focus()` after state reset
- Replace the mode label + add directions strip:
  ```
  <div className="border-b border-border">
    <div className="text-center py-2 text-muted-foreground text-sm">
      {mode label}
    </div>
    <div className="flex items-center justify-between px-4 lg:px-6 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">Directions:</span>
        <span>Paste a message</span>
        <span className="text-primary">→</span>
        <span>Choose how to respond</span>
        <span className="text-primary">→</span>
        <span>Copy the court-safe reply</span>
      </div>
      {step !== "input" && (
        <button onClick={handleStartOver} className="flex items-center gap-1.5 text-primary hover:underline text-xs">
          <RefreshCw className="h-3 w-3" />
          Start Over
        </button>
      )}
    </div>
  </div>
  ```
- Remove the Start Over button from the bottom controls (lines 359-366)
- Add `ref={inputRef}` to the message input element

