"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import useLoginApi from "@/api/useLoginApi";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
];

export default function IdleLogoutGuard() {
  const { logout } = useLoginApi();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_BEFORE_MS / 1000);
  const lastActivityRef = useRef(null);
  const loggedOutRef = useRef(false);
  const showWarningRef = useRef(false);

  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  const handleStayLoggedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  }, []);

  const handleLogoutNow = useCallback(() => {
    loggedOutRef.current = true;
    setShowWarning(false);
    logout();
  }, [logout]);

  useEffect(() => {
    lastActivityRef.current = Date.now();

    const markActive = () => {
      if (!showWarningRef.current) {
        lastActivityRef.current = Date.now();
      }
    };
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, markActive, { passive: true })
    );
    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, markActive)
      );
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (loggedOutRef.current) return;

      const remaining =
        IDLE_TIMEOUT_MS - (Date.now() - lastActivityRef.current);

      if (remaining <= 0) {
        loggedOutRef.current = true;
        setShowWarning(false);
        toast.info("You have been logged out due to inactivity");
        logout();
        return;
      }

      if (remaining <= WARNING_BEFORE_MS) {
        setSecondsLeft(Math.ceil(remaining / 1000));
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [logout]);

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You have been inactive for a while. For your security, you will
            be logged out in {secondsLeft}s unless you stay logged in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogoutNow}>
            Logout now
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleStayLoggedIn}>
            Stay logged in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
