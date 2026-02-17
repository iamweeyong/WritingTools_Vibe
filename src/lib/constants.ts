export const SYNOPSIS_TEMPLATE = `# Synopsis Board

## Premise


## Theme


## Protagonist (Desire/Flaw)


## Antagonist / Stakes


## Plot Outline (Act1/Act2/Act3)
- Act1:
- Act2:
- Act3:

## Ending Direction

`;

export const SCREENPLAY_SNIPPETS: Record<
  string,
  { label: string; text: string; shortcut: string }
> = {
  action: { label: 'Action', text: 'Action: ', shortcut: 'Ctrl-1' },
  character: { label: 'Character', text: '\nCHARACTER\n', shortcut: 'Ctrl-2' },
  dialogue: { label: 'Dialogue', text: '\nDialogue line\n', shortcut: 'Ctrl-3' },
  parenthetical: { label: 'Parenthetical', text: '(beat)', shortcut: 'Ctrl-4' },
  transition: { label: 'Transition', text: 'CUT TO:', shortcut: 'Ctrl-5' },
};

export const SAVE_DEBOUNCE_MS = 500;

export const SYNOPSIS_SECTIONS = [
  'premise',
  'theme',
  'protagonist',
  'antagonist',
  'plot_outline',
  'ending',
] as const;
