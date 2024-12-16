import { Fragment, type Node, Slice } from '@tiptap/pm/model';
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from '@tiptap/pm/state';
import { type EditorView, __serializeForClipboard } from '@tiptap/pm/view';
import type { GlobalDragHandleOptions } from '.';
import { absoluteRect, nodeDOMAtCoords, nodePosAtDOM } from './utils/dom';
import { DOM, NODE_TYPES, DEFAULT_OPTIONS, MIME_TYPES } from './constants';

const createDragHandle = (options: GlobalDragHandleOptions) => {
  let element: HTMLElement | null = null;
  return {
    get element() {
      return element;
    },
    init(view: EditorView) {
      element = options.dragHandleSelector
        ? document.querySelector<HTMLElement>(options.dragHandleSelector)
        : null;

      if (!element) {
        element = document.createElement('div');
        element.draggable = true;
        element.dataset.dragHandle = '';
        element.classList.add(DOM.CLASSES.DRAG_HANDLE);
        view?.dom?.parentElement?.appendChild(element);
      }
      this.hideDragHandle();
    },
    destroy() {
      element?.remove?.();
      element = null;
    },
    hideDragHandle() {
      element?.classList.add(DOM.CLASSES.HIDE);
    },
    showDragHandle() {
      element?.classList.remove(DOM.CLASSES.HIDE);
    },
  };
};

export function DragHandlePlugin(
  options: GlobalDragHandleOptions & { pluginKey: string },
) {
  const dragHandle = createDragHandle(options);
  let listType = '';

  return new Plugin({
    key: new PluginKey(options.pluginKey),
    view: (view) => {
      dragHandle.init(view);

      const onDragHandleDragStart = (e: DragEvent) =>
        handleDragStart({
          event: e,
          view,
          options,
          setListType: (type) => {
            listType = type;
          },
        });

      dragHandle.element?.addEventListener('dragstart', onDragHandleDragStart);

      const onDragHandleDrag = (e: DragEvent) => {
        dragHandle.hideDragHandle();
        const scrollY = window.scrollY;
        if (e.clientY < options.scrollThreshold) {
          window.scrollTo({ top: scrollY - 30, behavior: 'smooth' });
        } else if (window.innerHeight - e.clientY < options.scrollThreshold) {
          window.scrollTo({ top: scrollY + 30, behavior: 'smooth' });
        }
      };

      dragHandle.element?.addEventListener('drag', onDragHandleDrag);

      const boundHideHandleOnEditorOut = (event: MouseEvent) => {
        if (event.target instanceof Element) {
          const relatedTarget = event.relatedTarget as HTMLElement;
          const isInsideEditor =
            relatedTarget?.classList.contains(DOM.CLASSES.TIPTAP) ||
            relatedTarget?.classList.contains(DOM.CLASSES.DRAG_HANDLE);
          if (isInsideEditor) return;
        }
        dragHandle.hideDragHandle();
      };

      view?.dom?.parentElement?.addEventListener(
        'mouseout',
        boundHideHandleOnEditorOut,
      );

      return {
        destroy: () => {
          dragHandle.destroy();
          dragHandle.element?.removeEventListener('drag', onDragHandleDrag);
          dragHandle.element?.removeEventListener(
            'dragstart',
            onDragHandleDragStart,
          );
          view?.dom?.parentElement?.removeEventListener(
            'mouseout',
            boundHideHandleOnEditorOut,
          );
        },
      };
    },
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          if (!view.editable || !dragHandle.element) return;

          const node = nodeDOMAtCoords(
            {
              x: event.clientX + 50 + options.dragHandleWidth,
              y: event.clientY,
            },
            options,
          );

          const notDragging = node?.closest(`.${DOM.CLASSES.NOT_DRAGGABLE}`);
          const excludedTagList = options.excludedTags
            .concat([DOM.TAGS.ORDERED_LIST, DOM.TAGS.UNORDERED_LIST])
            .join(', ');

          if (
            !(node instanceof Element) ||
            node.matches(excludedTagList) ||
            notDragging
          ) {
            dragHandle.hideDragHandle();
            return;
          }

          const compStyle = window.getComputedStyle(node);
          const parsedLineHeight = parseInt(compStyle.lineHeight, 10);
          const lineHeight = isNaN(parsedLineHeight)
            ? parseInt(compStyle.fontSize) * 1.2
            : parsedLineHeight;
          const paddingTop = parseInt(compStyle.paddingTop, 10);

          const rect = absoluteRect(node);

          rect.top += (lineHeight - 24) / 2;
          rect.top += paddingTop;
          // Li markers
          const listItemsSelector = 'ul:not([data-type=taskList]) li, ol li';
          if (node.matches(listItemsSelector)) {
            rect.left -= options.dragHandleWidth;
          }
          rect.width = options.dragHandleWidth;

          dragHandle.element.style.left = `${rect.left - rect.width}px`;
          dragHandle.element.style.top = `${rect.top}px`;
          dragHandle.showDragHandle();
        },
        keydown: () => {
          dragHandle.hideDragHandle();
        },
        mousewheel: () => {
          dragHandle.hideDragHandle();
        },
        // dragging class is used for CSS
        dragstart: (view) => {
          view.dom.classList.add(DOM.CLASSES.DRAGGING);
        },
        drop: (view, event) => {
          view.dom.classList.remove(DOM.CLASSES.DRAGGING);
          dragHandle.hideDragHandle();
          let droppedNode: Node | null = null;
          const dropPos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });

          if (!dropPos) return;

          if (view.state.selection instanceof NodeSelection) {
            droppedNode = view.state.selection.node;
          }
          if (!droppedNode) return;

          const resolvedPos = view.state.doc.resolve(dropPos.pos);

          const isDroppedInsideList =
            resolvedPos.parent.type.name === NODE_TYPES.LIST_ITEM;

          // If the selected node is a list item and is not dropped inside a list, we need to wrap it inside <ol> tag otherwise ol list items will be transformed into ul list item when dropped
          if (
            view.state.selection instanceof NodeSelection &&
            view.state.selection.node.type.name === NODE_TYPES.LIST_ITEM &&
            !isDroppedInsideList &&
            listType === DOM.TAGS.ORDERED_LIST
          ) {
            const newList = view.state.schema.nodes[
              NODE_TYPES.ORDERED_LIST
            ]?.createAndFill(null, droppedNode);
            const slice = new Slice(Fragment.from(newList), 0, 0);
            view.dragging = { slice, move: event.ctrlKey };
          }
        },
        dragend: (view) => {
          view.dom.classList.remove(DOM.CLASSES.DRAGGING);
        },
      },
    },
  });
}

function handleDragStart({
  event,
  view,
  options,
  setListType,
}: {
  event: DragEvent;
  view: EditorView;
  options: GlobalDragHandleOptions;
  setListType: (type: string) => void;
}) {
  view.focus();

  if (!event.dataTransfer) return;

  const node = nodeDOMAtCoords(
    {
      x: event.clientX + 50 + options.dragHandleWidth,
      y: event.clientY,
    },
    options,
  );

  if (!(node instanceof Element)) return;

  let draggedNodePos = nodePosAtDOM(node, view, options);
  if (draggedNodePos == null || draggedNodePos < 0) return;
  draggedNodePos = calcNodePos(draggedNodePos, view);

  const { from, to } = view.state.selection;
  const diff = from - to;

  const fromSelectionPos = calcNodePos(from, view);
  let differentNodeSelected = false;

  const nodePos = view.state.doc.resolve(fromSelectionPos);

  if (nodePos.node().type.name === NODE_TYPES.DOC) differentNodeSelected = true;
  else {
    const nodeSelection = NodeSelection.create(
      view.state.doc,
      nodePos.before(),
    );

    differentNodeSelected = !(
      draggedNodePos + 1 >= nodeSelection.$from.pos &&
      draggedNodePos <= nodeSelection.$to.pos
    );
  }
  let selection = view.state.selection;
  if (
    !differentNodeSelected &&
    diff !== 0 &&
    !(view.state.selection instanceof NodeSelection)
  ) {
    const endSelection = NodeSelection.create(view.state.doc, to - 1);
    selection = TextSelection.create(
      view.state.doc,
      draggedNodePos,
      endSelection.$to.pos,
    );
  } else {
    selection = NodeSelection.create(view.state.doc, draggedNodePos);

    if (
      (selection as NodeSelection).node.type.isInline ||
      (selection as NodeSelection).node.type.name === NODE_TYPES.TABLE_ROW
    ) {
      const $pos = view.state.doc.resolve(selection.from);
      selection = NodeSelection.create(view.state.doc, $pos.before());
    }
  }
  view.dispatch(view.state.tr.setSelection(selection));

  if (
    view.state.selection instanceof NodeSelection &&
    view.state.selection.node.type.name === NODE_TYPES.LIST_ITEM
  ) {
    setListType(node.parentElement?.tagName || '');
  }

  const slice = view.state.selection.content();
  const { dom, text } = __serializeForClipboard(view, slice);

  event.dataTransfer.clearData();
  event.dataTransfer.setData(MIME_TYPES.TEXT_HTML, dom.innerHTML);
  event.dataTransfer.setData(MIME_TYPES.TEXT_PLAIN, text);
  event.dataTransfer.effectAllowed = 'copyMove';

  event.dataTransfer.setDragImage(node, 0, 0);

  view.dragging = { slice, move: event.ctrlKey };
}

function calcNodePos(pos: number, view: EditorView) {
  const $pos = view.state.doc.resolve(pos);
  if ($pos.depth > 1) return $pos.before($pos.depth);
  return pos;
}
