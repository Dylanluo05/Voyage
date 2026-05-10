import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Group, ItineraryItem, NewItemInput } from '../types';
import GroupBlock from './GroupBlock';

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
}

export default function SortableGroupBlock(props: Props) {
  const { group } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `group-${group._id}`,
    data: { type: 'group', day: group.day },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-item">
      <GroupBlock {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}
