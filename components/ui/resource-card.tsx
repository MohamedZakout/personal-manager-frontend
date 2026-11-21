"use client";

import Link from "next/link";
import {
  useCallback,
  useState,
  type CSSProperties,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from "react";
import { useToast } from "@/components/providers/app-providers";
import { errorMessage, initials } from "@/lib/format";

type IconName = "key" | "file" | "commands";

export type ResourceMetric = {
  label: string;
  value: number;
  icon: IconName;
};

function Icon({ name }: { name: IconName }) {
  if (name === "key") {
    return (
      <svg className="resource-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="8" cy="12" r="4" />
        <path d="M12 12h9M18 12v3M15.5 12v2" />
      </svg>
    );
  }
  if (name === "file") {
    return (
      <svg className="resource-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11.5 12.4 19a4.6 4.6 0 0 1-6.5-6.5l7.9-7.8a3 3 0 0 1 4.3 4.3l-7.9 7.8a1.5 1.5 0 0 1-2.1-2.1l7.2-7.2" />
      </svg>
    );
  }
  return (
    <svg className="resource-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </svg>
  );
}

function DragDots() {
  return (
    <svg className="resource-card-icon-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="resource-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 6.5 3 3" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg className="resource-card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6.5 7 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    </svg>
  );
}

export type CardDrag = {
  dragging: boolean;
  dropTarget: boolean;
  inactive: boolean;
  onHandleDragStart: (event: DragEvent<HTMLElement>, card: HTMLElement | null) => void;
  onCardDragEnter: () => void;
  onCardDragOver: (event: DragEvent<HTMLElement>) => void;
  onCardDrop: (event: DragEvent<HTMLElement>) => void;
  onCardDragEnd: () => void;
};

export function useResourceReorder<T extends { id: number }>(
  items: T[],
  setItems: Dispatch<SetStateAction<T[]>>,
  reorderApi: (ids: number[]) => Promise<void>,
) {
  const { toast } = useToast();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropId, setDropId] = useState<number | null>(null);

  const finish = useCallback(() => {
    setDraggingId(null);
    setDropId(null);
  }, []);

  const cardDrag = useCallback(
    (id: number): CardDrag => ({
      dragging: draggingId === id,
      dropTarget: dropId === id && draggingId !== id,
      inactive: draggingId !== null && draggingId !== id,
      onHandleDragStart: (event, card) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(id));
        if (card) event.dataTransfer.setDragImage(card, 24, 24);
        setDraggingId(id);
      },
      onCardDragEnter: () => {
        if (draggingId !== null && draggingId !== id) setDropId(id);
      },
      onCardDragOver: (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onCardDrop: (event) => {
        event.preventDefault();
        const sourceId = draggingId ?? Number(event.dataTransfer.getData("text/plain"));
        if (sourceId && sourceId !== id) {
          const ids = items.map((item) => item.id);
          const from = ids.indexOf(sourceId);
          const to = ids.indexOf(id);
          if (from >= 0 && to >= 0) {
            const previous = items;
            ids.splice(from, 1);
            ids.splice(to, 0, sourceId);
            const byId = new Map(items.map((item) => [item.id, item]));
            const reordered = ids
              .map((itemId) => byId.get(itemId))
              .filter((item): item is T => Boolean(item));
            setItems(reordered);
            void reorderApi(ids).catch((caught) => {
              setItems(previous);
              toast(errorMessage(caught), "error");
            });
          }
        }
        finish();
      },
      onCardDragEnd: finish,
    }),
    [draggingId, dropId, items, setItems, reorderApi, toast, finish],
  );

  return { cardDrag };
}

export function ResourceCard({
  name,
  href,
  category,
  metrics,
  onEdit,
  onDelete,
  drag,
}: {
  name: string;
  href: string;
  category?: { name: string; color?: string | null } | null;
  metrics: ResourceMetric[];
  onEdit?: () => void;
  onDelete?: () => void;
  drag?: CardDrag;
}) {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <article
      className={[
        "resource-card",
        drag?.dragging ? "is-dragging" : "",
        drag?.dropTarget ? "is-drop-target" : "",
        drag?.inactive ? "is-inactive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragEnter={drag?.onCardDragEnter}
      onDragOver={drag?.onCardDragOver}
      onDrop={drag?.onCardDrop}
    >
      {drag ? (
        <div
          className="resource-card-drag"
          draggable
          title="Drag to reorder"
          aria-label={`Drag to reorder ${name}`}
          onDragStart={(event) => drag.onHandleDragStart(event, event.currentTarget.closest(".resource-card"))}
          onDragEnd={drag.onCardDragEnd}
        >
          <DragDots />
        </div>
      ) : null}

      <Link href={href} className="resource-card-overlay" aria-label={name} />

      {hasActions ? (
        <div className="resource-card-actions">
          {onEdit ? (
            <button
              type="button"
              className="resource-card-icon-btn"
              onClick={onEdit}
              title="Edit"
              aria-label={`Edit ${name}`}
            >
              <EditIcon />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="resource-card-icon-btn is-danger"
              onClick={onDelete}
              title="Delete"
              aria-label={`Delete ${name}`}
            >
              <DeleteIcon />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="resource-card-body">
        <span className="resource-card-monogram" title={name} aria-hidden="true">
          {initials(name)}
        </span>
        <span className="resource-card-name">{name}</span>
      </div>

      <div className="resource-card-chips">
        {category ? (
          <span
            className="resource-chip resource-chip-category"
            style={{ "--category-color": category.color ?? "var(--line-strong)" } as CSSProperties}
          >
            <span className="resource-chip-dot" aria-hidden="true" />
            {category.name}
          </span>
        ) : null}
        {metrics.map((metric) => (
          <span className="resource-chip" key={metric.label}>
            <Icon name={metric.icon} />
            <span className="tabular-nums">{metric.value}</span>
            {metric.label}
          </span>
        ))}
      </div>
    </article>
  );
}
