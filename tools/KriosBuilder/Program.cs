using System.Diagnostics;

namespace KriosBuilder;

internal static class Program
{
    const string DefaultPublish = @"D:\aravindan\build\kriosbuild";
    const string DefaultRepo = @"D:\aravindan\project\freelancer\salonpos";

    static int Main(string[] args)
    {
        try
        {
            var repo = NormalizeDir(Arg(args, "--repo") ?? FirstPositional(args) ?? Environment.GetEnvironmentVariable("KRIOS_REPO") ?? FindRepo());
            var publish = NormalizeDir(Arg(args, "--out") ?? Environment.GetEnvironmentVariable("KRIOS_PUBLISH") ?? DefaultPublish);
            if (string.IsNullOrWhiteSpace(repo) || !IsRepo(repo))
            {
                Console.Error.WriteLine("Could not find the salonpos repo (backend/Krios/Krios.csproj).");
                Console.Error.WriteLine("Pass --repo \"D:\\aravindan\\project\\freelancer\\salonpos\"");
                return 1;
            }

            repo = Path.GetFullPath(repo);
            publish = Path.GetFullPath(publish);
            var wwwroot = Path.Combine(publish, "wwwroot");
            var csproj = Path.Combine(repo, "backend", "Krios", "Krios.csproj");
            var frontend = Path.Combine(repo, "frontend");
            var urlsSrc = Path.Combine(repo, "krios-urls.production.json");

            Console.WriteLine("Krios TakeBuild");
            Console.WriteLine($"  repo     {repo}");
            Console.WriteLine($"  server   {publish}");
            Console.WriteLine($"  UI       {wwwroot}");
            Console.WriteLine();

            StopPublishedKrios(publish);
            Directory.CreateDirectory(publish);

            Run("dotnet", $"publish \"{csproj}\" -c Release -o \"{publish}\" -p:SkipKriosFrontend=true --nologo", repo);

            if (!Directory.Exists(Path.Combine(frontend, "node_modules")))
                Run("npm", "install", frontend);

            Environment.SetEnvironmentVariable("KRIOS_WWWROOT", wwwroot);
            Run("cmd.exe", $"/c set KRIOS_WWWROOT={wwwroot}&& npm run build", frontend);

            WriteUrls(urlsSrc, wwwroot, publish);

            Console.WriteLine();
            Console.WriteLine("Build ready — one folder, Kestrel on port 5050.");
            Console.WriteLine($"  {Path.Combine(publish, "Krios.exe")}");
            Console.WriteLine("  UI files: wwwroot  |  krios-urls.json next to the exe and in wwwroot");
            Console.WriteLine("Run Krios.exe (or the reverse proxy in front of http://0.0.0.0:5050).");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    static void StopPublishedKrios(string publish)
    {
        var exe = Path.Combine(publish, "Krios.exe");
        if (!File.Exists(exe)) return;
        var full = Path.GetFullPath(exe);
        foreach (var p in Process.GetProcessesByName("Krios"))
        {
            try
            {
                var path = p.MainModule?.FileName;
                if (path != null && string.Equals(Path.GetFullPath(path), full, StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine($"Stopping running Krios.exe (pid {p.Id}) so files can be replaced...");
                    p.Kill(entireProcessTree: true);
                    p.WaitForExit(15000);
                }
            }
            catch
            {
                /* access denied / already exited */
            }
        }
    }

    static void WriteUrls(string src, string wwwroot, string publish)
    {
        Directory.CreateDirectory(wwwroot);
        var json = File.Exists(src)
            ? File.ReadAllText(src)
            : """
              {
                "backendListen": "http://0.0.0.0:5050",
                "frontendApiBaseUrl": "https://kriosapp.com"
              }
              """;
        File.WriteAllText(Path.Combine(wwwroot, "krios-urls.json"), json.Trim() + Environment.NewLine);
        File.WriteAllText(Path.Combine(publish, "krios-urls.json"), json.Trim() + Environment.NewLine);
        Console.WriteLine("Wrote krios-urls.json (listen :5050, API https://kriosapp.com).");
    }

    static bool IsRepo(string dir) =>
        File.Exists(Path.Combine(dir, "backend", "Krios", "Krios.csproj"));

    static string? NormalizeDir(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return path;
        var trimmed = path.Trim().Trim('"').Trim('\'');
        trimmed = trimmed.TrimEnd('\\', '/');
        try { return Path.GetFullPath(trimmed); }
        catch { return trimmed; }
    }

    static string? FirstPositional(string[] args)
    {
        for (var i = 0; i < args.Length; i++)
        {
            if (args[i].StartsWith('-'))
            {
                if (i + 1 < args.Length && !args[i + 1].StartsWith('-')) i++;
                continue;
            }
            return args[i];
        }
        return null;
    }

    static string? FindRepo()
    {
        foreach (var start in new[] { DefaultRepo, Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var dir = NormalizeDir(start);
            for (var i = 0; i < 8 && !string.IsNullOrEmpty(dir); i++)
            {
                if (IsRepo(dir)) return dir;
                dir = Directory.GetParent(dir)?.FullName;
            }
        }
        return IsRepo(DefaultRepo) ? DefaultRepo : null;
    }

    static string? Arg(string[] args, string name)
    {
        for (var i = 0; i < args.Length - 1; i++)
            if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
                return args[i + 1];
        return null;
    }

    static void Run(string file, string arguments, string workDir)
    {
        Console.WriteLine($"> {file} {arguments}");
        var psi = new ProcessStartInfo
        {
            FileName = file,
            Arguments = arguments,
            WorkingDirectory = workDir,
            UseShellExecute = false,
        };
        using var p = Process.Start(psi) ?? throw new InvalidOperationException($"Failed to start {file}");
        p.WaitForExit();
        if (p.ExitCode != 0)
            throw new InvalidOperationException($"{file} failed with exit {p.ExitCode}");
    }
}
