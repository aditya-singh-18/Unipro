// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';

// import { createProject } from '@/services/project.service';
// import { CreateProjectPayload } from '@/types/project';
// import {
//   TRACK_OPTIONS,
//   TRACK_TECH_STACK,
//   Track,
// } from '@/constants/track-tech';

// // ===============================
// // COMPONENT
// // ===============================
// export default function CreateProjectPage() {
//   const router = useRouter();

//   const [teamId, setTeamId] = useState<string>(''); // leader teams dropdown later
//   const [title, setTitle] = useState<string>('');
//   const [description, setDescription] = useState<string>('');

//   const [track, setTrack] = useState<Track | ''>('');
//   const [techStackInput, setTechStackInput] = useState<string>(''); // for OTHER
//   const [selectedTech, setSelectedTech] = useState<string[]>([]);
//   const [selectedOption, setSelectedOption] = useState<string>('');

//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);

//   // ===============================
//   // RESET TECH STACK WHEN TRACK CHANGES
//   // ===============================
//   useEffect(() => {
//     setSelectedTech([]);
//     setTechStackInput('');
//     setSelectedOption('');
//   }, [track]);

//   // ===============================
//   // ADD TECH STACK (PREDEFINED)
//   // ===============================
//   const addTechStack = (): void => {
//     if (!selectedOption) return;
//     if (selectedTech.includes(selectedOption)) return;

//     setSelectedTech((prev) => [...prev, selectedOption]);
//     setSelectedOption('');
//   };

//   // ===============================
//   // ADD TECH STACK (OTHER - FREE TEXT)
//   // ===============================
//   const addCustomTech = (): void => {
//     if (!techStackInput.trim()) return;

//     const values = techStackInput
//       .split(',')
//       .map((v) => v.trim())
//       .filter(Boolean);

//     setSelectedTech((prev) => {
//       const merged = [...prev];
//       values.forEach((v) => {
//         if (!merged.includes(v)) merged.push(v);
//       });
//       return merged;
//     });

//     setTechStackInput('');
//   };

//   // ===============================
//   // REMOVE TECH STACK
//   // ===============================
//   const removeTech = (tech: string): void => {
//     setSelectedTech((prev) => prev.filter((t) => t !== tech));
//   };

//   // ===============================
//   // SUBMIT
//   // ===============================
//   const handleSubmit = async (
//     e: React.FormEvent<HTMLFormElement>
//   ): Promise<void> => {
//     e.preventDefault();
//     setError(null);

//     if (!teamId || !title || !description || !track) {
//       setError('All required fields must be filled');
//       return;
//     }

//     if (selectedTech.length === 0) {
//       setError('Please select at least one tech stack');
//       return;
//     }

//     const payload: CreateProjectPayload = {
//       teamId,
//       title,
//       description,
//       track,
//       techStack: selectedTech,
//     };

//     try {
//       setLoading(true);
//       await createProject(payload);
//       router.push('/student/my-project');
//     } catch (err: unknown) {
//       if (err instanceof Error) {
//         setError(err.message);
//       } else {
//         setError('Failed to create project');
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ===============================
//   // RENDER
//   // ===============================
//   return (
//     <div>
//       <h2>Create Project</h2>

//       {error && <p style={{ color: 'red' }}>{error}</p>}

//       <form onSubmit={handleSubmit}>
//         {/* TEAM ID (TEMP INPUT — DROPDOWN LATER) */}
//         <div>
//           <label>Team ID *</label>
//           <input
//             type="text"
//             value={teamId}
//             onChange={(e) => setTeamId(e.target.value)}
//           />
//         </div>

//         {/* TITLE */}
//         <div>
//           <label>Project Title *</label>
//           <input
//             type="text"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//           />
//         </div>

//         {/* DESCRIPTION */}
//         <div>
//           <label>Description *</label>
//           <textarea
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//           />
//         </div>

//         {/* TRACK */}
//         <div>
//           <label>Track *</label>
//           <select
//             value={track}
//             onChange={(e) => setTrack(e.target.value as Track)}
//           >
//             <option value="">Select Track</option>
//             {TRACK_OPTIONS.map((t) => (
//               <option key={t} value={t}>
//                 {t}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* TECH STACK */}
//         {track && track !== 'OTHER' && (
//           <div>
//             <label>Tech Stack *</label>
//             <select
//               value={selectedOption}
//               onChange={(e) => setSelectedOption(e.target.value)}
//             >
//               <option value="">Select Technology</option>
//               {TRACK_TECH_STACK[track].map((tech) => (
//                 <option key={tech} value={tech}>
//                   {tech}
//                 </option>
//               ))}
//             </select>
//             <button type="button" onClick={addTechStack}>
//               Add
//             </button>
//           </div>
//         )}

//         {track === 'OTHER' && (
//           <div>
//             <label>Custom Tech Stack *</label>
//             <input
//               type="text"
//               placeholder="Type tech & press Add (comma separated)"
//               value={techStackInput}
//               onChange={(e) => setTechStackInput(e.target.value)}
//             />
//             <button type="button" onClick={addCustomTech}>
//               Add
//             </button>
//           </div>
//         )}

//         {/* SELECTED TECH STACK */}
//         {selectedTech.length > 0 && (
//           <div>
//             <p>Selected Tech Stack:</p>
//             {selectedTech.map((tech) => (
//               <span
//                 key={tech}
//                 style={{
//                   display: 'inline-block',
//                   margin: '4px',
//                   padding: '4px 8px',
//                   border: '1px solid #ccc',
//                 }}
//               >
//                 {tech}{' '}
//                 <button type="button" onClick={() => removeTech(tech)}>
//                   ✕
//                 </button>
//               </span>
//             ))}
//           </div>
//         )}

//         <button type="submit" disabled={loading}>
//           {loading ? 'Submitting...' : 'Create Project'}
//         </button>
//       </form>
//     </div>
//   );
// }
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Sidebar from '@/components/sidebar/StudentSidebar'
import Topbar from '@/components/dashboard/Topbar'
import UiverseButton from '@/components/ui/uiverse-button'

import { createProject } from '@/services/project.service'
import { getMyTeams } from '@/services/team/team.service'
import { CreateProjectPayload } from '@/types/project'
import {
  TRACK_OPTIONS,
  TRACK_TECH_STACK,
  Track,
} from '@/constants/track-tech'

type Team = {
  team_id: string
}

export default function CreateProjectPage() {
  const router = useRouter()

  /* ================= BASIC ================= */
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  /* ================= TRACK & TECH ================= */
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([])
  const [activeTrack, setActiveTrack] = useState<Track | ''>('')
  const [techStackMap, setTechStackMap] =
    useState<Record<string, string[]>>({})
  const [selectedTechOption, setSelectedTechOption] = useState('')
  const [customTechInput, setCustomTechInput] = useState('')

  /* ================= UI ================= */
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [techError, setTechError] = useState<string | null>(null)

  /* ================= FETCH TEAMS ================= */
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await getMyTeams()
        setTeams(res?.teams ?? [])
      } catch {
        setTeams([])
      }
    }
    fetchTeams()
  }, [])

  /* ================= TRACK ================= */
  const addTrack = (track: Track) => {
    if (selectedTracks.includes(track)) return
    setSelectedTracks((p) => [...p, track])
    setActiveTrack(track)
  }

  const removeTrack = (track: Track) => {
    setSelectedTracks((p) => p.filter((t) => t !== track))
    const copy = { ...techStackMap }
    delete copy[track]
    setTechStackMap(copy)
    if (activeTrack === track) setActiveTrack('')
  }

  /* ================= TECH ================= */
  const addTech = () => {
    if (!activeTrack || !selectedTechOption) return

    setTechStackMap((prev) => {
      const list = prev[activeTrack] || []
      if (list.includes(selectedTechOption)) {
        setTechError('Technology already added')
        return prev
      }
      setTechError(null)
      return {
        ...prev,
        [activeTrack]: [...list, selectedTechOption],
      }
    })
    setSelectedTechOption('')
  }

  const addCustomTech = () => {
    if (!activeTrack || !customTechInput.trim()) return

    const values = customTechInput
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)

    setTechStackMap((prev) => {
      const list = prev[activeTrack] || []
      return {
        ...prev,
        [activeTrack]: Array.from(new Set([...list, ...values])),
      }
    })
    setCustomTechInput('')
  }

  const removeTech = (track: Track, tech: string) => {
    setTechStackMap((prev) => ({
      ...prev,
      [track]: prev[track].filter((t) => t !== tech),
    }))
  }

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!teamId || !title || !description || selectedTracks.length === 0) {
      setError('All required fields must be filled')
      return
    }

    const mergedTech = Array.from(
      new Set(Object.values(techStackMap).flat())
    )

    if (mergedTech.length === 0) {
      setError('Please add at least one technology')
      return
    }

    const payload: CreateProjectPayload = {
      teamId,
      title,
      description,
      track: selectedTracks.join(','), // backend-safe
      techStack: mergedTech,
    }

    try {
      setLoading(true)
      await createProject(payload)
      router.push('/student/my-project')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : null
      setError(message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  /* ================= UI ================= */
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-300">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar title="Create New Project" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* HEADER */}
            <div className="flex items-center gap-4">
              <UiverseButton variant="back" onClick={() => router.back()}>
                ← Back
              </UiverseButton>
              <h1 className="text-xl font-semibold truncate">
                Project Details
              </h1>
            </div>

            {/* FORM */}
            <div className="glass rounded-2xl p-8">
              {error && (
                <p className="mb-4 text-red-600 font-medium">{error}</p>
              )}

              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                {/* TEAM */}
                <div className="md:col-span-2">
                  <label className="form-label">Team *</label>
                  <select
                    className="form-input"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                  >
                    <option value="">Select your team</option>
                    {teams.map((t) => (
                      <option key={t.team_id} value={t.team_id}>
                        {t.team_id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TITLE */}
                <div className="md:col-span-2">
                  <label className="form-label">Project Title *</label>
                  <input
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="md:col-span-2">
                  <label className="form-label">Description *</label>
                  <textarea
                    className="form-input min-h-[140px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* TRACK */}
                <div className="md:col-span-2">
                  <label className="form-label">Add Track *</label>
                  <select
                    className="form-input"
                    value=""
                    onChange={(e) =>
                      addTrack(e.target.value as Track)
                    }
                  >
                    <option value="">Select Track</option>
                    {TRACK_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TRACK CHIPS */}
                {selectedTracks.length > 0 && (
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    {selectedTracks.map((t) => (
                      <span
                        key={t}
                        className="chip"
                        onClick={() => removeTrack(t)}
                      >
                        {t} ✕
                      </span>
                    ))}
                  </div>
                )}

                {/* TECH */}
                {activeTrack && activeTrack !== 'OTHER' && (
                  <div className="md:col-span-2 flex gap-3">
                    <select
                      className="form-input flex-1"
                      value={selectedTechOption}
                      onChange={(e) =>
                        setSelectedTechOption(e.target.value)
                      }
                    >
                      <option value="">Select Technology</option>
                      {TRACK_TECH_STACK[activeTrack]?.map((tech) => (
                        <option key={tech} value={tech}>
                          {tech}
                        </option>
                      ))}
                    </select>
                    <UiverseButton
                      type="button"
                      variant="create"
                      onClick={addTech}
                    >
                      Add
                    </UiverseButton>
                  </div>
                )}

                {activeTrack === 'OTHER' && (
                  <div className="md:col-span-2 flex gap-3">
                    <input
                      className="form-input flex-1"
                      placeholder="Comma separated tech"
                      value={customTechInput}
                      onChange={(e) =>
                        setCustomTechInput(e.target.value)
                      }
                    />
                    <UiverseButton
                      type="button"
                      variant="create"
                      onClick={addCustomTech}
                    >
                      Add
                    </UiverseButton>
                  </div>
                )}

                {techError && (
                  <p className="md:col-span-2 text-sm text-orange-600">
                    {techError}
                  </p>
                )}

                {/* TECH CHIPS */}
                {Object.entries(techStackMap).map(([track, techs]) => (
                  <div
                    key={track}
                    className="md:col-span-2 flex flex-wrap gap-2"
                  >
                    {techs.map((tech) => (
                      <span
                        key={tech}
                        className="chip"
                        onClick={() =>
                          removeTech(track as Track, tech)
                        }
                      >
                        {tech} ✕
                      </span>
                    ))}
                  </div>
                ))}

                {/* SUBMIT */}
                <div className="md:col-span-2 pt-4">
                  <UiverseButton
                    variant="create"
                    disabled={loading}
                    type="submit"
                  >
                    {loading ? 'Submitting…' : 'Create Project'}
                  </UiverseButton>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* STYLES */}
      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .form-label {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
          display: block;
        }
        .form-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #ccc;
          outline: none;
        }
        .form-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
        }
        .chip {
          padding: 6px 12px;
          border-radius: 999px;
          background: #e0e7ff;
          color: #1e3a8a;
          font-size: 13px;
          cursor: pointer;
        }
        .chip:hover {
          background: #1e3a8a;
          color: #fff;
        }
      `}</style>
    </div>
  )
}
