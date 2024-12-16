import { Extension } from '@tiptap/core';
import { DragHandlePlugin } from './DragHandlePlugin';
import { DEFAULT_OPTIONS, PLUGIN_NAME } from './constants';

export interface GlobalDragHandleOptions {
  /**
   * The width of the drag handle
   */
  dragHandleWidth: number;

  /**
   * The offset of the drag handle
   */
  dragHandleOffset: number;

  /**
   * The threshold for scrolling
   */
  scrollThreshold: number;

  /*
   * The css selector to query for the drag handle. (eg: '.custom-handle').
   * If handle element is found, that element will be used as drag handle. If not, a default handle will be created
   */
  dragHandleSelector?: string;

  /**
   * Tags to be excluded for drag handle
   */
  excludedTags: string[];

  /**
   * Custom nodes to be included for drag handle
   */
  customNodes: string[];
}


const GlobalDragHandle = Extension.create<GlobalDragHandleOptions>({
  name: PLUGIN_NAME,

  addOptions() {
    return {
      dragHandleWidth: DEFAULT_OPTIONS.DRAG_HANDLE_WIDTH,
      dragHandleOffset: DEFAULT_OPTIONS.DRAG_HANDLE_OFFSET,
      scrollThreshold: DEFAULT_OPTIONS.SCROLL_THRESHOLD,
      excludedTags: [],
      customNodes: [],
    };
  },

  addProseMirrorPlugins() {
    return [
      DragHandlePlugin({
        pluginKey: PLUGIN_NAME,
        dragHandleWidth: this.options.dragHandleWidth,
        dragHandleOffset: this.options.dragHandleOffset,
        scrollThreshold: this.options.scrollThreshold,
        dragHandleSelector: this.options.dragHandleSelector,
        excludedTags: this.options.excludedTags,
        customNodes: this.options.customNodes,
      }),
    ];
  },
});

export default GlobalDragHandle;
