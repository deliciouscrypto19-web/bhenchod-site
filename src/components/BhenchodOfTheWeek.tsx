"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

interface Week {
  id: string;
  week_start_date: string;
  image_url: string;
  name: string;
  description: string | null;
  link: string | null;
  upvotes: number;
  downvotes: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getWeekLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  return `${formatDate(dateStr)} - ${formatDate(end.toISOString().slice(0, 10))}`;
}

export default function BhenchodOfTheWeek() {
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [allWeeks, setAllWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [nominationName, setNominationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch current week (most recent week_start_date <= today)
  const fetchCurrentWeek = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("weeks")
      .select("*")
      .lte("week_start_date", today)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .single();

    if (data) setCurrentWeek(data);
    setLoading(false);
  }, []);

  // Fetch all weeks for the picker
  const fetchAllWeeks = useCallback(async () => {
    const { data } = await supabase
      .from("weeks")
      .select("*")
      .order("week_start_date", { ascending: false });

    if (data) setAllWeeks(data);
  }, []);

  useEffect(() => {
    fetchCurrentWeek();
    fetchAllWeeks();
  }, [fetchCurrentWeek, fetchAllWeeks]);

  // Supabase Realtime subscription for live vote updates
  useEffect(() => {
    if (!currentWeek) return;

    const channel = supabase
      .channel("weeks-votes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "weeks",
          filter: `id=eq.${currentWeek.id}`,
        },
        (payload) => {
          const updated = payload.new as Week;
          setCurrentWeek((prev) => {
            if (!prev || prev.id !== updated.id) return prev;
            return { ...prev, upvotes: updated.upvotes, downvotes: updated.downvotes };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWeek?.id]);

  // Also subscribe to ALL weeks for the picker
  useEffect(() => {
    const channel = supabase
      .channel("all-weeks-votes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "weeks" },
        (payload) => {
          const updated = payload.new as Week;
          setAllWeeks((prev) =>
            prev.map((w) => (w.id === updated.id ? { ...w, upvotes: updated.upvotes, downvotes: updated.downvotes } : w))
          );
          setCurrentWeek((prev) => {
            if (!prev || prev.id !== updated.id) return prev;
            return { ...prev, upvotes: updated.upvotes, downvotes: updated.downvotes };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Optimistic vote + write to Supabase
  const handleVote = async (voteType: "up" | "down") => {
    if (!currentWeek) return;

    // Optimistic update
    setCurrentWeek((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        upvotes: voteType === "up" ? prev.upvotes + 1 : prev.upvotes,
        downvotes: voteType === "down" ? prev.downvotes + 1 : prev.downvotes,
      };
    });

    // Write to server
    await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId: currentWeek.id, voteType }),
    });
  };

  // Select a past week
  const selectWeek = (week: Week) => {
    setCurrentWeek(week);
    setShowPicker(false);
  };

  // Submit nomination
  const handleNominate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nominationName.trim() || submitting) return;

    setSubmitting(true);
    await fetch("/api/nominate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nominationName.trim() }),
    });
    setSubmitting(false);
    setNominationName("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted text-lg">Loading...</p>
      </div>
    );
  }

  if (!currentWeek) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted text-lg">No Bhenchod has been set for this week yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen px-4 py-8 sm:px-8 max-w-4xl mx-auto w-full relative">
      {/* Banner */}
      <h1 className="text-3xl sm:text-5xl font-bold text-center tracking-tight mb-8 sm:mb-12">
        Bhenchod of the Week
      </h1>

	<p className="text-center text-muted max-w-2xl mx-auto mb-8">
  Who is the Bhenchod of the Week. What is the meaning of Bhenchod? The answer is here.
	</p>

      {/* Featured Image */}
      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
          <Image
            src={currentWeek.image_url}
            alt={currentWeek.name}
            fill
            className="object-contain rounded-lg"
            sizes="(max-width: 768px) 100vw, 512px"
            priority
          />
        </div>
      </div>

      {/* Name + Description */}
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-4xl font-semibold">
          {currentWeek.link ? (
            <a
              href={currentWeek.link}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-accent transition-colors"
            >
              {currentWeek.name}
            </a>
          ) : (
            currentWeek.name
          )}
        </h2>
        {currentWeek.description && (
          <p className="text-muted text-base sm:text-lg mt-2">{currentWeek.description}</p>
        )}
      </div>

      {/* Vote Buttons */}
      <div className="flex justify-center items-center gap-8 sm:gap-16 mb-12">
        {/* Thumbs Down */}
        <button
          onClick={() => handleVote("down")}
          className="flex flex-col items-center gap-2 group"
        >
          <span className="text-5xl sm:text-6xl transition-transform group-hover:scale-110 select-none">
            👎
          </span>
          <span className="text-lg sm:text-xl font-mono text-muted group-hover:text-foreground transition-colors">
            {currentWeek.downvotes.toLocaleString()}
          </span>
        </button>

        {/* Thumbs Up */}
        <button
          onClick={() => handleVote("up")}
          className="flex flex-col items-center gap-2 group"
        >
          <span className="text-5xl sm:text-6xl transition-transform group-hover:scale-110 select-none">
            👍
          </span>
          <span className="text-lg sm:text-xl font-mono text-muted group-hover:text-foreground transition-colors">
            {currentWeek.upvotes.toLocaleString()}
          </span>
        </button>
      </div>

      {/* Bottom Row: Previous Bhenchods (left) + Nomination (right) */}
      <div className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4">
        {/* Previous Bhenchods */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPicker(!showPicker);
              if (!showPicker) fetchAllWeeks();
            }}
            className="text-sm text-muted hover:text-foreground transition-colors underline underline-offset-4"
          >
            Previous Bhenchods
          </button>

          {showPicker && (
            <div className="absolute bottom-full left-0 mb-2 bg-surface border border-border rounded-lg shadow-xl p-2 min-w-[280px] max-h-[300px] overflow-y-auto z-50">
              {allWeeks.map((week) => (
                <button
                  key={week.id}
                  onClick={() => selectWeek(week)}
                  className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-border transition-colors ${
                    week.id === currentWeek?.id ? "text-foreground font-semibold" : "text-muted"
                  }`}
                >
                  {getWeekLabel(week.week_start_date)} — {week.name}
                </button>
              ))}
              {allWeeks.length === 0 && (
                <p className="text-muted text-sm px-3 py-2">No weeks found.</p>
              )}
            </div>
          )}
        </div>

        {/* Nomination Form */}
        <form onSubmit={handleNominate} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={nominationName}
            onChange={(e) => setNominationName(e.target.value)}
            placeholder="Nominate someone..."
            className="bg-surface border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent w-full sm:w-48"
          />
          <button
            type="submit"
            disabled={submitting || !nominationName.trim()}
            className="bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm px-4 py-2 rounded transition-colors whitespace-nowrap"
          >
            {submitting ? "..." : submitted ? "Sent!" : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}
