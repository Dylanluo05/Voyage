import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ItineraryItem, NewItemInput } from '../types';
import ItineraryItemCard from './ItineraryItemCard';

interface Props {
  item: ItineraryItem;
  totalDays: number;
  saving: boolean;
  onSave: (patch: Partial<NewItemInput>) => Promise<void>;
  onDelete: () => Promise<void>;
  currentUserId?: string;
  onReact?: (emoji: string) => Promise<void>;
}

export default function SortableItineraryItem(props: Props) {
  const { item } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item._id, data: { day: item.day } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-item">
      <ItineraryItemCard
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
