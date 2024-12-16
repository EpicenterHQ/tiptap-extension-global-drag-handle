import type { GlobalDragHandleOptions } from '.';

export const PLUGIN_NAME = 'globalDragHandle' as const;

export const DEFAULT_OPTIONS = {
  dragHandleWidth: 20,
  dragHandleOffset: 50,
  scrollThreshold: 100,
  scrollSpeed: 30,
  lineHeightMultiplier: 1.2,
  excludedTags: [],
  customNodes: [],
} as const satisfies GlobalDragHandleOptions;

export const DOM = {
  CLASSES: {
    DRAG_HANDLE: 'drag-handle',
    HIDE: 'hide',
    DRAGGING: 'dragging',
    NOT_DRAGGABLE: 'not-draggable',
    TIPTAP: 'tiptap',
  },
  TAGS: {
    ORDERED_LIST: 'ol',
    UNORDERED_LIST: 'ul',
    LIST_ITEM: 'li',
  },
} as const;

export const NODE_TYPES = {
  DOC: 'doc',
  LIST_ITEM: 'listItem',
  ORDERED_LIST: 'orderedList',
  TABLE_ROW: 'tableRow',
} as const;

export const MIME_TYPES = {
  TEXT_HTML: 'text/html',
  TEXT_PLAIN: 'text/plain',
} as const;
