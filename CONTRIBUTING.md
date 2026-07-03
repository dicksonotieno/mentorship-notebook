# Contributing

Thanks for your interest in improving Mentorship Notebook. It's deliberately
small, dependency-free, and easy to reason about — please help keep it that way.

## Running it locally

No build step. Serve the folder with any static server and use demo mode so you
don't need a database:

```bash
python3 -m http.server 8000    # then open http://localhost:8000/?demo=1
# or:  npx serve
```

For changes that touch real data (auth, RLS, live queries), point `config.js` at a
throwaway Supabase project and follow [SETUP.md](SETUP.md).

## Ground rules

- **No build tooling, no framework, no runtime CDN.** Plain ES modules, one
  vendored library. If you need a dependency, vendor it into `vendor/` and pin the
  version (mirror how `supabase-js` is handled).
- **Security is enforced in the database.** Any new data access needs matching RLS
  policies in `schema.sql` and an idempotent file in `migrations/`. Never rely on a
  client-side check as a security control — the browser is untrusted. Read
  [SECURITY.md](SECURITY.md) first.
- **Never render user input with `innerHTML`.** Use `textContent` (the code uses a
  `txt()` helper for exactly this). `innerHTML` is only for hardcoded strings.
- **Keep the anon-only surface tiny.** Anything exposed to `anon` must be a view
  with only safe columns — never a raw table.
- **Match the existing style.** Small functions, clear names, comments only where
  intent isn't obvious.

## Making a change

1. Work on a branch.
2. Test in demo mode, and — if it touches data — against a test Supabase project.
3. If you changed the schema, include both the `schema.sql` edit **and** a
   migration under `migrations/`.
4. Describe what you changed and why. Note any new Supabase dashboard settings a
   deployer would need to apply.

## License

By contributing you agree that your contributions are licensed under the project's
[MIT License](LICENSE).
