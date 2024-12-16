import type { EditorView } from '@tiptap/pm/view';
import type { GlobalDragHandleOptions } from '..';


export function absoluteRect(node: Element) {
  const data = node.getBoundingClientRect();
  const modal = node.closest('[role="dialog"]');

  if (modal && window.getComputedStyle(modal).transform !== 'none') {
    const modalRect = modal.getBoundingClientRect();

    return {
      top: data.top - modalRect.top,
      left: data.left - modalRect.left,
      width: data.width,
    };
  }
  return {
    top: data.top,
    left: data.left,
    width: data.width,
  };
}

export function nodeDOMAtCoords(
  coords: { x: number; y: number },
  options: GlobalDragHandleOptions,
) {
  const selectors = [
    'li',
    'p:not(:first-child)',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    ...options.customNodes.map((node) => `[data-type=${node}]`),
  ].join(', ');
  return document
    .elementsFromPoint(coords.x, coords.y)
    .find(
      (elem: Element) =>
        elem.parentElement?.matches?.('.ProseMirror') ||
        elem.matches(selectors),
    );
}
export function nodePosAtDOM(
  node: Element,
  view: EditorView,
  options: GlobalDragHandleOptions,
) {
  const boundingRect = node.getBoundingClientRect();

  return view.posAtCoords({
    left: boundingRect.left + options.dragHandleOffset + options.dragHandleWidth,
    top: boundingRect.top + 1,
  })?.inside;
}
