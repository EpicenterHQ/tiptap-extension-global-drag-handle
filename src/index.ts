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

  /**
   * The speed of the scroll
   */
  scrollSpeed: number;

  /**
   * The multiplier for the line height
   */
  lineHeightMultiplier: number;

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
    return DEFAULT_OPTIONS;
  },

  addProseMirrorPlugins() {
    return [DragHandlePlugin({ pluginKey: PLUGIN_NAME, ...this.options })];
  },
});

export default GlobalDragHandle;
