'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import { supabase } from '@/utils/supabaseClient';
import DashboardIcon from './DashboardIcon';
import Button from '@/components/ui/Button';
import ChessWorkspace from './ChessWorkspace';

import { endClassAction, startClassAction } from '@/actions/classes';
import { getZoomSignatureAction } from '@/actions/zoom';
import { listHomeworkAction, listChaptersAction, assignChapterToClassAction } from '@/actions/homework';

interface StudentInfo {
  firstName: string;
  lastName: string;
  email: string;
  studentProfileId?: string;
}

interface ClassroomWorkspaceProps {
  classId: string;
  role: 'admin' | 'coach' | 'student';
  userName: string;
  coachName: string;
  classType: string;
  duration: number;
  scheduledStart: string;
  initialStatus: string;
  students: StudentInfo[];
  zoomStartUrl: string;
  zoomJoinUrl: string;
  userId: string;
}

interface ChatMessage {
  id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface HomeworkChapter {
  id: string;
  title: string;
  chapter_number: number;
  workbook_id: string;
  pdf_storage_path: string | null;
}

interface HomeworkWorkbook {
  id: string;
  title: string;
  track: string;
}

export default function ClassroomWorkspace({
  classId,
  role,
  userName,
  coachName,
  classType,
  duration,
  scheduledStart,
  initialStatus,
  students,
  zoomStartUrl,
  zoomJoinUrl,
  userId,
}: ClassroomWorkspaceProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Microphone & Camera permission state
  const [micState, setMicState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const requestMicPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicState('granted');
    } catch (err: any) {
      console.warn('Microphone permission request:', err);
      setMicState('denied');
    }
  }, []);

  // Check initial mic permission status
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator?.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        if (result.state === 'granted') setMicState('granted');
        result.onchange = () => {
          if (result.state === 'granted') setMicState('granted');
          else if (result.state === 'denied') setMicState('denied');
        };
      }).catch(() => {});
    }
  }, []);

  // Elapsed seconds timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Authorization role checks
  const isCoach = role === 'coach' || role === 'admin';

  // --- 1. Resizable / Draggable Panel Layout States ---
  const [leftWidth, setLeftWidth] = useState(260); // px
  const [rightWidth, setRightWidth] = useState(340); // px
  const [bottomHeight, setBottomHeight] = useState(200); // px

  const [panelPlacements, setPanelPlacements] = useState<Record<string, string[]>>({
    left: ['participants'],
    center: ['chessboard'],
    right: ['zoom', 'chat', 'homework', 'notes'],
    bottom: [],
  });


  // Load layout preferences on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedLayout = localStorage.getItem(`classroom_layout_${classId}`);
      if (savedLayout) {
        setPanelPlacements(JSON.parse(savedLayout));
      }
      const savedLeft = localStorage.getItem(`classroom_width_left_${classId}`);
      if (savedLeft) setLeftWidth(parseInt(savedLeft));
      const savedRight = localStorage.getItem(`classroom_width_right_${classId}`);
      if (savedRight) setRightWidth(parseInt(savedRight));
      const savedBottom = localStorage.getItem(`classroom_height_bottom_${classId}`);
      if (savedBottom) setBottomHeight(parseInt(savedBottom));
    } catch (e) {
      console.error('Failed to load layout preferences:', e);
    }
  }, [classId]);

  // Drag and Drop arrangement handlers
  const handleDragStart = (e: React.DragEvent, panelId: string) => {
    const target = e.target as HTMLElement;
    const isDragHandle = target.closest('.drag-handle');
    if (!isDragHandle) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', panelId);
  };

  const handleDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    const panelId = e.dataTransfer.getData('text/plain');
    if (!panelId) return;

    setPanelPlacements((prev) => {
      const next = { ...prev };
      // Remove from old slot
      Object.keys(next).forEach((col) => {
        next[col] = next[col].filter((id) => id !== panelId);
      });
      // Add to new slot
      next[targetColumn] = [...next[targetColumn], panelId];
      localStorage.setItem(`classroom_layout_${classId}`, JSON.stringify(next));
      return next;
    });
  };

  // Drag Resize handlers
  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(400, moveEvent.clientX));
      setLeftWidth(newWidth);
    };
    const stopDrag = () => {
      localStorage.setItem(`classroom_width_left_${classId}`, String(leftWidth));
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(250, Math.min(500, window.innerWidth - moveEvent.clientX));
      setRightWidth(newWidth);
    };
    const stopDrag = () => {
      localStorage.setItem(`classroom_width_right_${classId}`, String(rightWidth));
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
  };

  const startResizeBottom = (e: React.MouseEvent) => {
    e.preventDefault();
    const doDrag = (moveEvent: MouseEvent) => {
      const newHeight = Math.max(150, Math.min(400, window.innerHeight - moveEvent.clientY));
      setBottomHeight(newHeight);
    };
    const stopDrag = () => {
      localStorage.setItem(`classroom_height_bottom_${classId}`, String(bottomHeight));
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
  };

  // --- 2. Real-Time Chat ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatUnread, setChatUnread] = useState(0);
  const [activePanelTab, setActivePanelTab] = useState<'chat' | 'homework' | 'notes'>('chat');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch chat history
  useEffect(() => {
    const fetchChat = async () => {
      const { data, error } = await supabase
        .from('classroom_chat')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setMessages(data);
      }
    };
    fetchChat();
  }, [classId]);

  // --- 3. Supabase Consolidated Realtime Channel ---
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const mainChannelRef = useRef<any>(null);

  useEffect(() => {
    const channelTopic = `classroom-main:${classId}`;
    
    // Ensure any existing channel with this topic is cleaned up first
    if (typeof supabase.getChannels === 'function') {
      const existing = supabase.getChannels().find((c: any) => c.topic === `realtime:${channelTopic}` || c.topic === channelTopic);
      if (existing) {
        supabase.removeChannel(existing);
      }
    }

    const channel = supabase.channel(channelTopic, {
      config: {
        broadcast: { self: false },
        presence: { key: classId }
      }
    });

    channel
      .on('broadcast', { event: 'chat-message' }, ({ payload }: any) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
        if (activePanelTab !== 'chat') {
          setChatUnread((u) => u + 1);
        }
      })
      .on('broadcast', { event: 'homework-assigned' }, ({ payload }: any) => {
        if (!isCoach) {
          alert(`New Homework Assigned: Chapter ${payload.chapterNumber}. ${payload.chapterTitle}`);
          if (payload.pdfStoragePath) {
            setActiveChapterFile(payload.pdfStoragePath);
            setActivePanelTab('homework');
          }
        }
      })
      .on('broadcast', { event: 'notes-update' }, ({ payload }: any) => {
        if (!isCoach) {
          setSessionNotes(payload.notes);
        }
      })
      .on('broadcast', { event: 'status-change' }, ({ payload }: any) => {
        setStatus(payload.status);
        if (payload.status === 'COMPLETED') {
          router.push(role === 'coach' || role === 'admin' ? '/dashboard/coach/classes' : '/dashboard/student/classes');
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.values(state)
          .flat()
          .map((p: any) => p.userId);
        setOnlineUserIds(onlineIds);
      })
      .subscribe(async (subStatus: string) => {
        if (subStatus === 'SUBSCRIBED') {
          await channel.track({
            userId: userName,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    mainChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      mainChannelRef.current = null;
    };
  }, [classId, userName, isCoach, activePanelTab, role, router]);

  // --- 4. Database Class Status Realtime Listener ---
  useEffect(() => {
    const channel = supabase
      .channel(`classes-status-changes:${classId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'classes',
          filter: `id=eq.${classId}`,
        },
        (payload: any) => {
          setStatus(payload.new.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  // --- 5. Record student join timestamp when class goes LIVE ---
  useEffect(() => {
    if (role === 'student' && status === 'LIVE' && userId) {
      import('@/actions/classes').then(({ recordStudentClassJoinAction }) => {
        recordStudentClassJoinAction(classId, userId).then((res) => {
          if (!res.success) {
            console.error('Failed to record student class join:', res.error);
          } else {
            console.log('Recorded student class join timestamp.');
          }
        });
      });
    }
  }, [status, role, classId, userId]);

  useEffect(() => {
    if (activePanelTab === 'chat') {
      setChatUnread(0);
    }
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activePanelTab]);

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      sender_name: userName,
      sender_role: role,
      message: chatInput.trim(),
      created_at: new Date().toISOString(),
    };

    // Optimistic UI updates
    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    // Broadcast instantly to online peers
    mainChannelRef.current?.send({
      type: 'broadcast',
      event: 'chat-message',
      payload: newMsg,
    });

    // Persist in background (fire-and-forget)
    supabase.from('classroom_chat').insert({
      class_id: classId,
      sender_name: userName,
      sender_role: role,
      message: newMsg.message,
    }).then(({ error }: { error: any }) => {
      if (error) {
        console.warn('Failed to save message to database:', error.message);
      }
    });
  };

  // --- 4. Embedded Zoom SDK with Fallback ---
  const [zoomSdkKey, setZoomSdkKey] = useState('');
  const [zoomSignature, setZoomSignature] = useState('');
  const [zoomLoading, setZoomLoading] = useState(false);
  const [zoomError, setZoomError] = useState(false);

  const getPasscodeFromJoinUrl = (joinUrl: string): string => {
    if (!joinUrl) return 'chesshub';
    try {
      const u = new URL(joinUrl);
      const pwd = u.searchParams.get('pwd');
      return pwd || 'chesshub';
    } catch {
      return 'chesshub';
    }
  };

  const getMeetingNumberFromUrl = (joinUrl: string): string => {
    if (!joinUrl) return '';
    try {
      const u = new URL(joinUrl);
      const match = u.pathname.match(/\/j\/(\d+)/);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  };

  const initializeZoomSDK = useCallback(async () => {
    if (!zoomJoinUrl) return;
    setZoomLoading(true);
    setZoomError(false);

    const meetingNumber = getMeetingNumberFromUrl(zoomJoinUrl);
    const roleVal = isCoach ? 1 : 0;

    // 1. Get Signature via Server Action
    const res = await getZoomSignatureAction(meetingNumber, roleVal);
    if (!res.success || !res.data) {
      setZoomError(true);
      setZoomLoading(false);
      return;
    }

    setZoomSdkKey(res.data.sdkKey);
    setZoomSignature(res.data.signature);

    // 2. Load Zoom Component View SDK dynamically
    if (typeof window !== 'undefined') {
      const scriptId = 'zoom-embedded-sdk-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://source.zoom.us/zoom-meeting-embedded-3.8.5.min.js';
        script.async = true;
        document.body.appendChild(script);
      }

      const initMeeting = (retryCount = 0) => {
        try {
          const { ZoomMtgEmbedded } = window as any;
          if (!ZoomMtgEmbedded) {
            setZoomError(true);
            setZoomLoading(false);
            return;
          }

          const target = document.getElementById('meetingSDKElement');
          if (!target) {
            if (retryCount < 6) {
              setTimeout(() => initMeeting(retryCount + 1), 300);
            } else {
              setZoomError(true);
              setZoomLoading(false);
            }
            return;
          }

          target.innerHTML = '';

          const client = ZoomMtgEmbedded.createClient();
          client.init({
            zoomAppHeader: false,
            language: 'en-US',
            meetingInfo: [
              'topic',
              'mn',
              'host',
              'participant'
            ],
            customize: {
              meeting: {
                popper: {
                  disableinvite: true,
                },
              },
            },
          });

          // Safety fallback timer: hide loading overlay after 4 seconds max
          const fallbackTimer = setTimeout(() => {
            setZoomLoading(false);
          }, 4000);

          client.join({
            sdkKey: res.data!.sdkKey,
            signature: res.data!.signature,
            meetingNumber,
            password: getPasscodeFromJoinUrl(zoomJoinUrl),
            userName,
            userEmail: 'classroom@chesshub.com',
            success: () => {
              clearTimeout(fallbackTimer);
              setZoomLoading(false);
            },
            error: (err: any) => {
              clearTimeout(fallbackTimer);
              console.error('Zoom Embedded SDK join failure:', err);
              setZoomError(true);
              setZoomLoading(false);
            },
          });
        } catch (err) {
          console.error(err);
          setZoomError(true);
          setZoomLoading(false);
        }
      };

      if ((window as any).ZoomMtgEmbedded) {
        initMeeting();
      } else {
        script.onload = () => initMeeting();
        script.onerror = () => {
          setZoomError(true);
          setZoomLoading(false);
        };
      }
    }
  }, [zoomJoinUrl, isCoach, userName]);

  useEffect(() => {
    if (status === 'LIVE' && zoomJoinUrl) {
      initializeZoomSDK();
    }
  }, [status, zoomJoinUrl, initializeZoomSDK]);


  // --- 5. Homework Management ---
  const [workbooks, setWorkbooks] = useState<HomeworkWorkbook[]>([]);
  const [chapters, setChapters] = useState<HomeworkChapter[]>([]);
  const [selectedWbId, setSelectedWbId] = useState('');
  const [assignedChapters, setAssignedChapters] = useState<string[]>([]);
  const [activeChapterFile, setActiveChapterFile] = useState<string | null>(null);

  // Load Homework catalog for Coach
  useEffect(() => {
    if (isCoach) {
      const loadCatalog = async () => {
        const res = await listHomeworkAction();
        if (res.success && res.data) {
          setWorkbooks(res.data as any[]);
        }
      };
      loadCatalog();
    }
  }, [isCoach]);

  const loadWorkbookChapters = async (wbId: string) => {
    setSelectedWbId(wbId);
    if (!wbId) {
      setChapters([]);
      return;
    }
    const res = await listChaptersAction(wbId);
    if (res.success && res.data) {
      setChapters(res.data as any[]);
    }
  };

  const handleAssignHomework = async (ch: HomeworkChapter) => {
    if (!isCoach) return;
    const res = await assignChapterToClassAction({
      chapterId: ch.id,
      classId,
      coachProfileId: classId, // mock or fetch actual profile
    });

    if (res.success) {
      setAssignedChapters((prev) => [...prev, ch.id]);
      // Broadcast homework notification
      mainChannelRef.current?.send({
        type: 'broadcast',
        event: 'homework-assigned',
        payload: {
          chapterTitle: ch.title,
          chapterNumber: ch.chapter_number,
          pdfStoragePath: ch.pdf_storage_path,
        },
      });
      alert(`Homework "${ch.title}" successfully assigned to class!`);
    } else {
      alert(res.error?.message || 'Failed to assign homework.');
    }
  };



  // --- 6. Real-Time Notes Sync ---
  const [sessionNotes, setSessionNotes] = useState('');
  const notesChannelRef = useRef<any>(null);

  // Fetch initial notes
  useEffect(() => {
    const fetchNotes = async () => {
      const { data } = await supabase
        .from('classes')
        .select('session_notes')
        .eq('id', classId)
        .maybeSingle();
      if (data?.session_notes) {
        setSessionNotes(data.session_notes);
      }
    };
    fetchNotes();
  }, [classId]);

  // Broadcast notes typing
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSessionNotes(val);
    if (isCoach) {
      mainChannelRef.current?.send({
        type: 'broadcast',
        event: 'notes-update',
        payload: { notes: val },
      });

      // Save to database
      supabase
        .from('classes')
        .update({ session_notes: val })
        .eq('id', classId)
        .then(({ error }: { error: any }) => {
          if (error) console.error('Failed to save session notes:', error.message);
        });
    }
  };

  // Start / End Session triggers
  const handleStartClass = () => {
    setError('');
    startTransition(async () => {
      const res = await startClassAction(classId);
      if (res?.success) {
        setStatus('LIVE');
        mainChannelRef.current?.send({
          type: 'broadcast',
          event: 'status-change',
          payload: { status: 'LIVE' },
        });
      } else {
        setError(res?.error?.message || 'Failed to start class.');
      }
    });
  };

  const handleEndClass = () => {
    if (confirm('Are you sure you want to end this class session? Both you and the student will return to your dashboards.')) {
      setError('');
      startTransition(async () => {
        const res = await endClassAction(classId);
        if (res?.success) {
          mainChannelRef.current?.send({
            type: 'broadcast',
            event: 'status-change',
            payload: { status: 'COMPLETED' },
          });
          router.push(isCoach ? '/dashboard/coach/classes' : '/dashboard/student/classes');
        } else {
          setError(res?.error?.message || 'Failed to end class.');
        }
      });
    }
  };


  // Dynamic class elapsed timer
  useEffect(() => {
    if (status !== 'LIVE') return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatElapsed = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  // --- Render Layout components ---
  const renderPanel = (panelId: string) => {
    switch (panelId) {
      case 'participants':
        return (
          <div key={panelId} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-3 border-b border-slate-800 pb-2 drag-handle cursor-grab active:cursor-grabbing select-none">
                <DashboardIcon iconKey="users" className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold text-accent uppercase tracking-wider">Attendance List</span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {/* Coach Badge */}
                <div className="bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                      👨‍🏫
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-200">{coachName}</p>
                      <p className="text-[9px] text-amber-400/80 font-medium">Assigned FIDE Coach</p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Coach" />
                </div>

                {students.map((student, idx) => {
                  const isOnline = onlineUserIds.includes(`${student.firstName} ${student.lastName}`);
                  return (
                    <div key={idx} className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{student.firstName} {student.lastName}</p>
                          <p className="text-[9px] text-slate-500">{student.email}</p>
                        </div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} title={isOnline ? 'Online' : 'Offline'} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'chessboard':
        return (
          <div key={panelId} className="h-full flex items-center justify-center">
            <ChessWorkspace classId={classId} userRole={role} showEngine={isCoach} />
          </div>
        );

      case 'zoom':
        const getMeetingNumberFromUrl = (url?: string): string => {
          if (!url) return '';
          const match = url.match(/\/[js]\/(\d+)/);
          return match ? match[1] : '';
        };

        const getPasscodeFromJoinUrl = (url?: string): string => {
          if (!url) return '';
          const match = url.match(/[?&]pwd=([^&]+)/);
          return match ? match[1] : '';
        };

        const meetingNumber = getMeetingNumberFromUrl(zoomJoinUrl);
        const passcode = getPasscodeFromJoinUrl(zoomJoinUrl);
        const zoomEmbedUrl = meetingNumber 
          ? `https://zoom.us/wc/join/${meetingNumber}?pwd=${passcode}&un=${encodeURIComponent(userName)}`
          : zoomJoinUrl;

        return (
          <div key={panelId} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 drag-handle cursor-grab active:cursor-grabbing select-none">
              <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                📹 Live Video Classroom
              </span>
              <div className="flex items-center gap-2">
                {passcode && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Meeting ID: ${meetingNumber}\nPasscode: ${passcode}`);
                      alert(`Copied to clipboard!\nMeeting ID: ${meetingNumber}\nPasscode: ${passcode}`);
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-accent rounded-lg text-[10px] font-semibold border border-slate-700 transition-colors"
                  >
                    📋 Passcode: <span className="font-mono text-white">{passcode}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setZoomError((prev) => !prev);
                    setZoomLoading(false);
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold border border-slate-700 transition-colors"
                  title="Toggle Web View / Embedded Mode"
                >
                  {zoomError ? '⚡ Try Embedded SDK' : '🌐 Web View'}
                </button>
              </div>
            </div>

            {/* Mic Permission Helper Banner if mic is not granted yet */}
            {micState !== 'granted' && status === 'LIVE' && (
              <div className="bg-amber-950/40 border border-amber-800/60 text-amber-200 rounded-xl p-2 mb-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🎙️</span>
                  <span>Enable mic & camera for video classroom</span>
                </div>
                <button
                  type="button"
                  onClick={requestMicPermission}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-[10px] shadow transition-colors"
                >
                  Enable Mic & Camera
                </button>
              </div>
            )}

            <div className="flex-grow flex flex-col justify-center items-center h-full w-full">
              {status === 'LIVE' && zoomJoinUrl ? (
                <div className="w-full h-full min-h-[350px] bg-slate-950 rounded-xl overflow-hidden relative border border-slate-800 flex-grow flex flex-col">
                  {!zoomError ? (
                    <div id="meetingSDKElement" className="w-full h-full flex-grow relative" />
                  ) : (
                    <iframe
                      src={zoomEmbedUrl}
                      className="w-full h-full absolute inset-0 border-0"
                      allow="microphone *; camera *; display-capture *; autoplay *; media-record *; fullscreen *; microphone; camera; display-capture"
                    />
                  )}

                  {zoomLoading && !zoomError && (
                    <div className="absolute inset-0 bg-slate-950 flex items-center justify-center z-10">
                      <div className="text-center space-y-2">
                        <span className="text-xl animate-spin inline-block">⏳</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loading secure classroom...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-6">
                  Video activates once the coach starts the live session.
                </p>
              )}
            </div>
          </div>
        );

      case 'chat':
        return (
          <div key={panelId} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-full flex flex-col justify-between">
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-2 drag-handle cursor-grab active:cursor-grabbing select-none">
              <span className="text-xs font-bold text-accent uppercase tracking-wider">Classroom Live Chat</span>
              {chatUnread > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500 text-white font-bold text-[9px]">{chatUnread}</span>}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-[200px] pr-1">
              {messages.map((msg, idx) => (
                <div key={msg.id || idx} className="bg-slate-950/30 p-2 rounded-xl border border-slate-800/40 text-xs">
                  <div className="flex justify-between text-[10px] font-bold mb-0.5">
                    <span className={msg.sender_role === 'coach' || msg.sender_role === 'admin' ? 'text-accent' : 'text-primary'}>
                      {msg.sender_name} ({msg.sender_role})
                    </span>
                    <span className="text-slate-500">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{msg.message}</p>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={sendChatMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Send a chat message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent flex-grow text-white"
              />
              <button type="submit" className="bg-accent text-surface-dark font-bold text-xs px-3 py-2 rounded-lg hover:bg-accent-hover transition-colors">
                Send
              </button>
            </form>
          </div>
        );

      case 'homework':
        return (
          <div key={panelId} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-full flex flex-col justify-between">
            <div className="border-b border-slate-800 pb-2 mb-2 drag-handle cursor-grab active:cursor-grabbing select-none">
              <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                📚 Homework &amp; Workbooks
              </span>
            </div>

            {isCoach ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Select Curriculum Workbook</label>
                  <select
                    value={selectedWbId}
                    onChange={(e) => loadWorkbookChapters(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded px-2 py-1 focus:outline-none"
                  >
                    <option value="">-- Choose Workbook --</option>
                    {workbooks.map((wb) => (
                      <option key={wb.id} value={wb.id}>
                        {wb.title} ({wb.track})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto border border-slate-800/40 p-2 rounded-lg bg-slate-950/20">
                  {chapters.map((ch) => {
                    const isAssigned = assignedChapters.includes(ch.id);
                    return (
                      <div key={ch.id} className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-800">
                        <span>Chapter {ch.chapter_number}. {ch.title}</span>
                        <button
                          onClick={() => handleAssignHomework(ch)}
                          disabled={isAssigned}
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            isAssigned ? 'bg-slate-850 text-slate-500' : 'bg-accent hover:bg-accent-hover text-surface-dark'
                          }`}
                        >
                          {isAssigned ? 'Assigned' : 'Assign'}
                        </button>
                      </div>
                    );
                  })}
                  {selectedWbId && chapters.length === 0 && <p className="text-slate-500 italic">No chapters in this workbook.</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs flex-1 flex flex-col justify-center items-center text-center p-6 bg-slate-950/40 rounded-xl border border-slate-800">
                <span className="text-3xl">📚</span>
                <p className="font-semibold text-white mt-2">Active Chapter Assigned</p>
                <p className="text-slate-400 mt-1">Please go to your student dashboard to solve the homework puzzles for this chapter.</p>
              </div>
            )}
          </div>
        );

      case 'notes':
        return (
          <div key={panelId} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-full flex flex-col justify-between">
            <div className="border-b border-slate-800 pb-2 mb-2 drag-handle cursor-grab active:cursor-grabbing select-none">
              <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                📝 Coach Instructional Notes
              </span>
            </div>

            <textarea
              readOnly={!isCoach}
              value={sessionNotes}
              onChange={handleNotesChange}
              placeholder="Instructor whiteboard notes. Updates dynamically for enrolled students..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (role === 'student' && status === 'SCHEDULED') {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping"></span>
            <div className="relative w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-3xl animate-bounce">🎓</span>
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-wider mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Classroom Waiting Room
            </span>
            <h1 className="text-xl font-bold font-heading text-white">Waiting for your Coach</h1>
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              The classroom will open automatically as soon as the Coach starts the session. Please stay on this page.
            </p>
          </div>

          {/* Members in waiting room */}
          <div className="border-t border-slate-800 pt-4 text-left">
            <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2.5">
              Online in Waiting Room ({onlineUserIds.length})
            </h3>
            {onlineUserIds.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No one else is here yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {onlineUserIds.map((name, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 pt-4 flex justify-center">
            <Link
              href="/dashboard"
              className="inline-block py-2.5 px-5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
            >
              Exit to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark text-white flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-indigo-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 hover:border-slate-600 focus:outline-none"
          >
            <DashboardIcon iconKey="arrowLeft" className="w-3.5 h-3.5" />
            <span>Exit Workspace</span>
          </Link>
          <div className="h-5 w-px bg-slate-800/80"></div>
          <div>
            <h1 className="text-sm font-bold font-heading flex items-center gap-2.5">
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200 bg-clip-text text-transparent font-black tracking-wide text-base">
                ChessHub Academy Classroom
              </span>
              <span className="text-xs bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-yellow-500/20 border border-amber-500/40 text-amber-300 font-bold px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-md">
                👨‍🏫 {coachName}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Classroom Session:</span>
              <span className="font-mono text-slate-200 font-bold">{classId.substring(0, 8)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Header elapsed timer */}
          {status === 'LIVE' && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 px-3.5 py-1 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-mono font-black text-emerald-300 tabular-nums">
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>
          )}


          {/* Coach start/end actions */}
          {isCoach && status === 'SCHEDULED' && (
            <button
              onClick={handleStartClass}
              disabled={isPending}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              {isPending ? 'Starting...' : 'Start Class'}
            </button>
          )}

          {isCoach && (status === 'SCHEDULED' || status === 'LIVE') && (
            <button
              onClick={handleEndClass}
              disabled={isPending}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              {isPending ? 'Ending...' : 'End Class'}
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Drag-and-Drop Column Layout */}
      <div className="flex-grow flex overflow-hidden">
        {/* LEFT COLUMN */}
        <div
          className="hidden md:flex flex-col gap-4 p-4 border-r border-slate-800 bg-slate-900/30 overflow-y-auto relative"
          style={{ width: `${leftWidth}px` }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'left')}
        >
          {panelPlacements.left.map((id) => (
            <div
              key={id}
              draggable
              onDragStart={(e) => handleDragStart(e, id)}
              className="cursor-move h-full"
            >
              {renderPanel(id)}
            </div>
          ))}
          {/* Vertical left resizer bar */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/40 bg-transparent transition-all"
            onMouseDown={startResizeLeft}
          />
        </div>

        {/* CENTER COLUMN (Chessboard) */}
        <div
          className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto relative bg-slate-950/20"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'center')}
        >
          {panelPlacements.center.map((id) => (
            <div
              key={id}
              draggable
              onDragStart={(e) => handleDragStart(e, id)}
              className="cursor-move"
            >
              {renderPanel(id)}
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN */}
        <div
          className="hidden lg:flex flex-col gap-4 p-4 border-l border-slate-800 bg-slate-900/30 overflow-y-auto relative"
          style={{ width: `${rightWidth}px` }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'right')}
        >
          {panelPlacements.right.map((id) => (
            <div
              key={id}
              draggable
              onDragStart={(e) => handleDragStart(e, id)}
              className="cursor-move"
            >
              {renderPanel(id)}
            </div>
          ))}
          {/* Vertical right resizer bar */}
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-accent/40 bg-transparent transition-all"
            onMouseDown={startResizeRight}
          />
        </div>
      </div>
    </div>
  );
}
