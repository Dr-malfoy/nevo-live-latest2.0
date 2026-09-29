import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiHeartFill as Heart, PiUsersFill as Users } from 'react-icons/pi';
import { fanClubApi, type FanClubEntry, type FanGroup } from '../api/social.api';
import { optional } from '../api/pending';
import { useUIStore } from '../stores';
import { ScreenHeader, TabBar, PillTabs, EmptyState, HelpButton, PendingApiNotice } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';

/**
 * Fan Club and Fan Group — requirements #41 and #59.
 *
 * #59 (fan group chat) is **not a separate screen**: group chat reuses the
 * existing chat thread, so tapping a group opens `/chat/:chatId`. Building a
 * second messaging UI for groups would have meant maintaining two.
 *
 * Endpoints are specified in BACKEND-GUIDE.md §4.10.
 */

type Tab = 'club' | 'group';
type Scope = 'joined' | 'mine';

export const FanClub = () => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('club');
  const [scope, setScope] = useState<Scope>('joined');
  const [clubs, setClubs] = useState<FanClubEntry[]>([]);
  const [groups, setGroups] = useState<FanGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      if (tab === 'club') {
        // "My Club" returns a single club (or null); "Joined" returns a list.
        const res =
          scope === 'joined'
            ? await optional(fanClubApi.getJoined()).catch(() => null)
            : await optional(fanClubApi.getMine()).catch(() => null);
        if (cancelled) return;
        const data = res?.data as FanClubEntry | FanClubEntry[] | null | undefined;
        setClubs(Array.isArray(data) ? data : data ? [data] : []);
        setLive(!!res?.success);
        return;
      }

      const res = await optional(fanClubApi.getGroups(scope)).catch(() => null);
      if (cancelled) return;
      setGroups(res?.data ?? []);
      setLive(!!res?.success);
    };

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tab, scope]);

  const lightUp = async (hostId: string) => {
    const res = await optional(fanClubApi.lightUp(hostId)).catch(() => null);
    if (res === null) {
      showToast('Fan clubs are not connected yet', 'info');
      return;
    }
    showToast('Lit up', 'success');
  };

  const createGroup = async () => {
    if (!newName.trim()) return;
    const res = await optional(fanClubApi.createGroup(newName.trim())).catch(() => null);
    if (res === null) {
      showToast('Creating a group is not available yet', 'info');
      setCreating(false);
      return;
    }
    if (res.success && res.data) {
      setGroups((rows) => [res.data as FanGroup, ...rows]);
      showToast('Group created', 'success');
    }
    setCreating(false);
    setNewName('');
  };

  const openGroup = (group: FanGroup) => {
    // #59 — the group's thread is an ordinary chat.
    if (group.chatId) navigate(`/chat/${group.chatId}`);
    else showToast('This group has no chat yet', 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFE9F2] via-[#F0F4FF] to-surface-soft pb-24">
      <ScreenHeader title="" right={<HelpButton />}>
        <div className="px-4">
          <TabBar
            tabs={[
              { key: 'club', label: 'Fan Club' },
              { key: 'group', label: 'Fan group' },
            ]}
            active={tab}
            onChange={(k) => setTab(k as Tab)}
          />
        </div>
      </ScreenHeader>

      <PillTabs
        tabs={[
          { key: 'joined', label: tab === 'club' ? 'Joined Club' : 'Joined groups' },
          { key: 'mine', label: tab === 'club' ? 'My Club' : 'My group' },
        ]}
        active={scope}
        onChange={(k) => setScope(k as Scope)}
        className="px-4 pt-3"
      />

      {loading ? (
        <Loading className="pt-16" size="lg" />
      ) : tab === 'club' ? (
        clubs.length === 0 ? (
          <>
            <EmptyState
              icon={<Heart className="w-6 h-6" />}
              title={
                scope === 'mine'
                  ? "You don't have a fan club yet"
                  : live
                    ? "You haven't joined a club"
                    : 'Fan clubs not connected'
              }
              hint={scope === 'joined' && live ? 'Join a host\'s club from their profile.' : undefined}
            />
            {!live && <PendingApiNotice section="§4.10" what="Fan clubs" />}
          </>
        ) : (
          <div className="px-3 pt-3 space-y-2.5">
            {clubs.map((club) => (
              <div key={club._id} className="flex items-center gap-3 bg-white rounded-card p-3">
                <Avatar src={club.host?.avatar} nickname={club.host?.nickname || '?'} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-ink truncate">{club.host?.nickname}</span>
                    {club.clubName && (
                      <span className="h-[18px] px-1.5 rounded bg-surface-sunken text-[10px] font-bold text-ink-muted flex items-center shrink-0">
                        {club.tier ?? 1} {club.clubName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Fan Power <span className="text-accent-500 font-semibold">{club.fanPower}</span>
                  </p>
                </div>
                <button
                  onClick={() => lightUp(club.host._id)}
                  className="h-9 px-4 rounded-full bg-[#FF5C8A] text-white text-sm font-bold shrink-0"
                >
                  Light Up
                </button>
              </div>
            ))}
          </div>
        )
      ) : groups.length === 0 ? (
        <>
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title={scope === 'mine' ? 'No groups yet' : 'You are not in any group'}
            hint={scope === 'mine' ? 'Create one to chat with your fans together.' : undefined}
          />
          {!live && <PendingApiNotice section="§4.10" what="Fan groups" />}
        </>
      ) : (
        <div className="px-3 pt-3 space-y-2.5">
          {groups.map((group) => (
            <button
              key={group._id}
              onClick={() => openGroup(group)}
              className="w-full flex items-center gap-3 bg-white rounded-card p-3 text-left active:bg-surface-sunken"
            >
              <Avatar src={group.avatar} nickname={group.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink truncate">{group.name}</p>
                <p className="text-xs text-ink-muted mt-0.5">Group Members: {group.memberCount}</p>
              </div>
            </button>
          ))}
          <p className="text-center text-xs text-ink-faint py-2">No more</p>
        </div>
      )}

      {/* Create group (#41.4) */}
      {tab === 'group' && scope === 'mine' && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-line safe-bottom z-30 px-4 py-3">
          {creating ? (
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                maxLength={20}
                placeholder="Group name"
                className="flex-1 h-12 px-4 rounded-full bg-surface-sunken text-ink placeholder:text-ink-faint
                  border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none"
              />
              <button
                onClick={createGroup}
                disabled={!newName.trim()}
                className="h-12 px-5 btn-primary disabled:opacity-40"
              >
                Create
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full h-12 rounded-full bg-accent-500 text-white font-bold"
            >
              Create Group
            </button>
          )}
        </div>
      )}
    </div>
  );
};
