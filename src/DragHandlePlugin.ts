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

type DragHandleState = {
  dragHandleElement: HTMLElement | null;
  listType: string;
};

export function DragHandlePlugin(
  options: GlobalDragHandleOptions & { pluginKey: string },
) {
  const state: DragHandleState = {
    dragHandleElement: null,
    listType: '',
  };

  return new Plugin({
    key: new PluginKey(options.pluginKey),
    view: (view) => {
      const handleBySelector = options.dragHandleSelector
        ? document.querySelector<HTMLElement>(options.dragHandleSelector)
        : null;
      state.dragHandleElement =
        handleBySelector ?? document.createElement('div');
      state.dragHandleElement.draggable = true;
      state.dragHandleElement.dataset.dragHandle = '';
      state.dragHandleElement.classList.add('drag-handle');

      const onDragHandleDragStart = (e: DragEvent) =>
        handleDragStart(e, view, options, state);

      state.dragHandleElement.addEventListener(
        'dragstart',
        onDragHandleDragStart,
      );

      const onDragHandleDrag = (e: DragEvent) => {
        hideDragHandle(state);
        const scrollY = window.scrollY;
        if (e.clientY < options.scrollThreshold) {
          window.scrollTo({ top: scrollY - 30, behavior: 'smooth' });
        } else if (window.innerHeight - e.clientY < options.scrollThreshold) {
          window.scrollTo({ top: scrollY + 30, behavior: 'smooth' });
        }
      };

      state.dragHandleElement.addEventListener('drag', onDragHandleDrag);

      hideDragHandle(state);

      if (!handleBySelector) {
        view?.dom?.parentElement?.appendChild(state.dragHandleElement);
      }

      const boundHideHandleOnEditorOut = (e: MouseEvent) =>
        hideHandleOnEditorOut(e, state);

      view?.dom?.parentElement?.addEventListener(
        'mouseout',
        boundHideHandleOnEditorOut,
      );

      return {
        destroy: () => {
          if (!handleBySelector) {
            state.dragHandleElement?.remove?.();
          }
          state.dragHandleElement?.removeEventListener(
            'drag',
            onDragHandleDrag,
          );
          state.dragHandleElement?.removeEventListener(
            'dragstart',
            onDragHandleDragStart,
          );
          state.dragHandleElement = null;
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
          if (!view.editable) {
            return;
          }

          const node = nodeDOMAtCoords(
            {
              x: event.clientX + 50 + options.dragHandleWidth,
              y: event.clientY,
            },
            options,
          );

          const notDragging = node?.closest('.not-draggable');
          const excludedTagList = options.excludedTags
            .concat(['ol', 'ul'])
            .join(', ');

          if (
            !(node instanceof Element) ||
            node.matches(excludedTagList) ||
            notDragging
          ) {
            hideDragHandle(state);
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
          if (node.matches('ul:not([data-type=taskList]) li, ol li')) {
            rect.left -= options.dragHandleWidth;
          }
          rect.width = options.dragHandleWidth;

          if (!state.dragHandleElement) return;

          state.dragHandleElement.style.left = `${rect.left - rect.width}px`;
          state.dragHandleElement.style.top = `${rect.top}px`;
          showDragHandle(state);
        },
        keydown: () => {
          hideDragHandle(state);
        },
        mousewheel: () => {
          hideDragHandle(state);
        },
        // dragging class is used for CSS
        dragstart: (view) => {
          view.dom.classList.add('dragging');
        },
        drop: (view, event) => {
          view.dom.classList.remove('dragging');
          hideDragHandle(state);
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
            resolvedPos.parent.type.name === 'listItem';

          // If the selected node is a list item and is not dropped inside a list, we need to wrap it inside <ol> tag otherwise ol list items will be transformed into ul list item when dropped
          if (
            view.state.selection instanceof NodeSelection &&
            view.state.selection.node.type.name === 'listItem' &&
            !isDroppedInsideList &&
            state.listType == 'OL'
          ) {
            const newList = view.state.schema.nodes.orderedList?.createAndFill(
              null,
              droppedNode,
            );
            const slice = new Slice(Fragment.from(newList), 0, 0);
            view.dragging = { slice, move: event.ctrlKey };
          }
        },
        dragend: (view) => {
          view.dom.classList.remove('dragging');
        },
      },
    },
  });
}

function handleDragStart(
  event: DragEvent,
  view: EditorView,
  options: GlobalDragHandleOptions,
  state: DragHandleState,
) {
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

  if (nodePos.node().type.name === 'doc') differentNodeSelected = true;
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
      (selection as NodeSelection).node.type.name === 'tableRow'
    ) {
      const $pos = view.state.doc.resolve(selection.from);
      selection = NodeSelection.create(view.state.doc, $pos.before());
    }
  }
  view.dispatch(view.state.tr.setSelection(selection));

  if (
    view.state.selection instanceof NodeSelection &&
    view.state.selection.node.type.name === 'listItem'
  ) {
    state.listType = node.parentElement?.tagName || '';
  }

  const slice = view.state.selection.content();
  const { dom, text } = __serializeForClipboard(view, slice);

  event.dataTransfer.clearData();
  event.dataTransfer.setData('text/html', dom.innerHTML);
  event.dataTransfer.setData('text/plain', text);
  event.dataTransfer.effectAllowed = 'copyMove';

  event.dataTransfer.setDragImage(node, 0, 0);

  view.dragging = { slice, move: event.ctrlKey };
}

function hideDragHandle(state: DragHandleState) {
  if (state.dragHandleElement) {
    state.dragHandleElement.classList.add('hide');
  }
}

function showDragHandle(state: DragHandleState) {
  if (state.dragHandleElement) {
    state.dragHandleElement.classList.remove('hide');
  }
}

function hideHandleOnEditorOut(event: MouseEvent, state: DragHandleState) {
  if (event.target instanceof Element) {
    const relatedTarget = event.relatedTarget as HTMLElement;
    const isInsideEditor =
      relatedTarget?.classList.contains('tiptap') ||
      relatedTarget?.classList.contains('drag-handle');

    if (isInsideEditor) return;
  }
  hideDragHandle(state);
}

function calcNodePos(pos: number, view: EditorView) {
  const $pos = view.state.doc.resolve(pos);
  if ($pos.depth > 1) return $pos.before($pos.depth);
  return pos;
}
