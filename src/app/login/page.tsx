    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-soft">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-soft">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  </div>
</div>
