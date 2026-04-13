import { renderHook, act, waitFor } from "@testing-library/react-native";

type AuthCallback = (event: string, session: unknown) => void;

jest.mock("@/lib/supabase", () => {
  const mockCallbacks: AuthCallback[] = [];
  const mockUnsubscribe = jest.fn();
  const state = { initialSession: null as unknown };
  return {
    __esModule: true,
    __mockCallbacks: mockCallbacks,
    __mockUnsubscribe: mockUnsubscribe,
    __mockState: state,
    supabase: {
      auth: {
        getSession: jest.fn(async () => ({ data: { session: state.initialSession } })),
        onAuthStateChange: jest.fn((cb: AuthCallback) => {
          mockCallbacks.push(cb);
          return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
        }),
      },
    },
  };
});

import * as supabaseMock from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

const mock = supabaseMock as unknown as {
  __mockCallbacks: AuthCallback[];
  __mockUnsubscribe: jest.Mock;
  __mockState: { initialSession: unknown };
};

describe("useSession", () => {
  beforeEach(() => {
    mock.__mockCallbacks.length = 0;
    mock.__mockState.initialSession = null;
    mock.__mockUnsubscribe.mockClear();
  });

  it("resolves to null session when no initial session", async () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
  });

  it("resolves to the initial session when present", async () => {
    mock.__mockState.initialSession = { user: { id: "u-1" } };
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toEqual({ user: { id: "u-1" } });
  });

  it("updates session when auth state changes", async () => {
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      mock.__mockCallbacks.forEach((cb) => cb("SIGNED_IN", { user: { id: "u-2" } }));
    });

    expect(result.current.session).toEqual({ user: { id: "u-2" } });
  });

  it("unsubscribes on unmount", async () => {
    const { unmount } = renderHook(() => useSession());
    await waitFor(() => expect(mock.__mockUnsubscribe).not.toHaveBeenCalled());
    unmount();
    expect(mock.__mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
