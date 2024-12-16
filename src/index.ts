import { Extension } from '@tiptap/core';
import { DragHandlePlugin } from './DragHandlePlugin';

export interface GlobalDragHandleOptions {
  /**
   * The width of the drag handle
   */
  dragHandleWidth: number;

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


const GlobalDragHandle = Extension.create({
  name: 'globalDragHandle',

  addOptions() {
    return {
      dragHandleWidth: 20,
      scrollThreshold: 100,
      excludedTags: [],
      customNodes: [],
    };
  },

  addProseMirrorPlugins() {
    return [
      DragHandlePlugin({
        pluginKey: 'globalDragHandle',
        dragHandleWidth: this.options.dragHandleWidth,
        scrollThreshold: this.options.scrollThreshold,
        dragHandleSelector: this.options.dragHandleSelector,
        excludedTags: this.options.excludedTags,
        customNodes: this.options.customNodes,
      }),
    ];
  },
});

export default GlobalDragHandle;
