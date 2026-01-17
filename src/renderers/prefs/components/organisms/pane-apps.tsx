import type { DragEndEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import { useDispatch } from 'react-redux'

import type { AppName } from '../../../../config/apps.js'
import Input from '../../../shared/components/atoms/input.js'
import { Spinner } from '../../../shared/components/atoms/spinner.js'
import type { InstalledApp } from '../../../shared/state/hooks.js'
import {
  useDeepEqualSelector,
  useInstalledApps,
  useKeyCodeMap,
  useRemovedApps,
} from '../../../shared/state/hooks.js'
import { removedApp, reorderedApp, restoredApp, updatedHotCode } from '../../state/actions.js'
import { Pane } from '../molecules/pane.js'

type SortableItemProps = {
  readonly id: InstalledApp['name']
  readonly name: InstalledApp['name']
  readonly index: number
  readonly icon?: string
  readonly keyCode?: string
}

const SortableItem = ({
  id,
  name,
  keyCode = '',
  index,
  icon = '',
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const dispatch = useDispatch()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={clsx(
        'flex',
        'bg-black/5 shadow dark:bg-white/5',
        'mb-4 rounded-xl',
        'focus-visible:bg-white/70 focus-visible:shadow-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:focus-visible:bg-black',
        isDragging &&
          'focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-gray-100',
      )}
    >
      <div 
        {...listeners}
        className="flex w-16 items-center justify-center p-4 cursor-grab active:cursor-grabbing"
      >
        {index + 1}
      </div>
      <div 
        {...listeners}
        className="flex grow items-center p-4 cursor-grab active:cursor-grabbing"
      >
        <img
          alt=""
          className={clsx('mr-4 size-8', !icon && 'hidden')}
          src={icon}
        />
        <span>{name}</span>
      </div>
      <div className="flex items-center justify-center p-4">
        <Input
          aria-label={`${name} hotkey`}
          className="h-8 w-12"
          data-app-id={id}
          maxLength={1}
          minLength={0}
          onChange={(event) => event.preventDefault()}
          onFocus={(event) => {
            event.target.select()
          }}
          onKeyPress={(event) => {
            dispatch(
              updatedHotCode({
                appName: id,
                value: event.code,
              }),
            )
          }}
          placeholder="Key"
          type="text"
          value={keyCode}
        />
      </div>
      <div className="flex items-center justify-center p-4">
        <button
          aria-label={`Remove ${name}`}
          className="flex size-8 items-center justify-center rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:text-red-400 dark:hover:text-red-300"
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            dispatch(removedApp({ appName: id }))
          }}
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  )
}

type RemovedAppItemProps = {
  readonly name: InstalledApp['name']
  readonly icon?: string
}

const RemovedAppItem = ({ name, icon = '' }: RemovedAppItemProps) => {
  const dispatch = useDispatch()

  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
      <div className="flex items-center">
        <img
          alt=""
          className={clsx('mr-3 size-6 opacity-50', !icon && 'hidden')}
          src={icon}
        />
        <span className="text-gray-600 dark:text-gray-400">{name}</span>
      </div>
      <button
        aria-label={`Restore ${name}`}
        className="flex size-6 items-center justify-center rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:text-green-400 dark:hover:text-green-300"
        onClick={() => {
          dispatch(restoredApp({ appName: name }))
        }}
        type="button"
      >
        +
      </button>
    </div>
  )
}

export function AppsPane(): JSX.Element {
  const dispatch = useDispatch()

  const installedApps = useInstalledApps().map((installedApp) => ({
    ...installedApp,
    id: installedApp.name,
  }))

  const removedApps = useRemovedApps()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      dispatch(
        reorderedApp({
          destinationName: over?.id as AppName,
          sourceName: active.id as AppName,
        }),
      )
    }
  }

  const icons = useDeepEqualSelector((state) => state.data.icons)

  const keyCodeMap = useKeyCodeMap()

  return (
    <Pane pane="apps">
      {installedApps.length === 0 && removedApps.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      )}

      <div className="overflow-y-auto p-2">
        {/* Active Apps Section */}
        {installedApps.length > 0 && (
          <>
            <h3 className="mb-4 text-lg font-semibold">Active Apps</h3>
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
              sensors={sensors}
            >
              <SortableContext
                items={installedApps}
                strategy={verticalListSortingStrategy}
              >
                {installedApps.map(({ id, name, hotCode }, index) => (
                  <SortableItem
                    key={id}
                    icon={icons[id]}
                    id={id}
                    index={index}
                    keyCode={keyCodeMap[hotCode || '']}
                    name={name}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {installedApps.length > 1 && (
              <p className="mt-2 text-sm opacity-70">
                Drag and drop to sort the list of apps.
              </p>
            )}
          </>
        )}

        {/* Removed Apps Section */}
        {removedApps.length > 0 && (
          <div className={clsx('mt-8', installedApps.length === 0 && 'mt-2')}>
            <h3 className="mb-4 text-lg font-semibold">Removed Apps</h3>
            <div className="space-y-2">
              {removedApps.map(({ name }) => (
                <RemovedAppItem
                  key={name}
                  icon={icons[name]}
                  name={name}
                />
              ))}
            </div>
            <p className="mt-2 text-sm opacity-70">
              Click + to restore an app to the active list.
            </p>
          </div>
        )}
      </div>
    </Pane>
  )
}
