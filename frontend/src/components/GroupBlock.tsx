import { Fragment, FormEvent, useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Group, ItineraryItem, NewItemInput } from '../types';
import SortableItineraryItem from './SortableItineraryItem';
import CommuteWidget from './CommuteWidget';

interface Props {
  group: Group;
  items: ItineraryItem[];
  totalDays: number;
  savingItemId: string | null;
  onSaveItem: (itemId: string, patch: Partial<NewItemInput>) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onReactToItem: (itemId: string, emoji: string) => Promise<void>;
  onRename: (title: string) => Promise<void>;
  onDissolve: () => Promise<void>;
  currentUserId?: string;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export default function GroupBlock({
  group,
  items,
  totalDays,
  savingItemId,
  onSaveItem,
  onDeleteItem,
  onReactToItem,
  onRename,
  onDissolve,
  currentUserId,
  dragHandleProps,
}: Props) {
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(group.title);

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!titleDraft.trim()) return;
    await onRename(titleDraft.trim());
    setRenaming(false);
  }

  return (
    <div className="group-block">
      <div className="group-block-header">
        {dragHandleProps && (
          <button
            type="button"
            className="drag-handle"
            aria-label="Drag group to reorder"
            {...dragHandleProps}
          >
            ⋮⋮
          </button>
        )}
        {renaming ? (
          <form onSubmit={handleRename} className="group-rename-form">
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              autoFocus
              className="group-rename-input"
            />
            <button type="submit" className="small-btn">Save</button>
            <button
              type="button"
              className="ghost small-btn"
              onClick={() => { setRenaming(false); setTitleDraft(group.title); }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <span className="group-title">{group.title}</span>
            <div className="group-actions">
              <button type="button" className="ghost small-btn" onClick={() => setRenaming(true)}>
                Rename
              </button>
              <button type="button" className="danger small-btn" onClick={onDissolve}>
                Ungroup
              </button>
            </div>
          </>
        )}
      </div>

      <SortableContext items={items.map((i) => i._id)} strategy={verticalListSortingStrategy}>
        <ul className="item-list group-item-list">
          {items.map((item, idx) => {
            const nextItem = items[idx + 1];
            const hasLoc = (loc: typeof item.location) =>
              loc !== undefined &&
              ((loc.lat !== undefined && loc.lng !== undefined) || !!loc.address || !!loc.name);
            const showCommute = nextItem !== undefined && hasLoc(item.location) && hasLoc(nextItem.location);
            return (
              <Fragment key={item._id}>
                <li>
                  <SortableItineraryItem
                    item={item}
                    totalDays={totalDays}
                    saving={savingItemId === item._id}
                    onSave={(patch) => onSaveItem(item._id, patch)}
                    onDelete={() => onDeleteItem(item._id)}
                    currentUserId={currentUserId}
                    onReact={(emoji) => onReactToItem(item._id, emoji)}
                  />
                </li>
                {showCommute && (
                  <li className="commute-row">
                    <CommuteWidget origin={item.location!} destination={nextItem.location!} />
                  </li>
                )}
              </Fragment>
            );
          })}
        </ul>
      </SortableContext>
    </div>
  );
}
