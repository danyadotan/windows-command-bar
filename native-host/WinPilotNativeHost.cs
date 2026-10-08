using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;

internal static class WinPilotNativeHost
{
    private const string AllowedOrigin = "chrome-extension://dbkcdkaciiebdadcnmbmeljjfalbobkh/";
    private const int MaxMessageBytes = 1024 * 1024;
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = MaxMessageBytes };

    public static int Main(string[] args)
    {
        if (args.Length == 0 || !String.Equals(args[0], AllowedOrigin, StringComparison.Ordinal)) return 2;
        try
        {
            using (Stream input = Console.OpenStandardInput())
            using (Stream output = Console.OpenStandardOutput())
            {
                while (HandleOne(input, output)) { }
            }
            return 0;
        }
        catch { return 1; }
    }

    private static bool HandleOne(Stream input, Stream output)
    {
        byte[] lengthBytes = ReadExact(input, 4);
        if (lengthBytes == null) return false;
        int length = BitConverter.ToInt32(lengthBytes, 0);
        if (length < 0 || length > MaxMessageBytes) throw new InvalidDataException("Invalid native message length");
        byte[] body = ReadExact(input, length);
        if (body == null) throw new EndOfStreamException();
        object response;
        try
        {
            Dictionary<string, object> request = Json.DeserializeObject(Encoding.UTF8.GetString(body)) as Dictionary<string, object>;
            object type;
            if (request == null || !request.TryGetValue("type", out type)) response = Error("invalid-request");
            else if (String.Equals(type as string, "ping", StringComparison.Ordinal)) response = new Dictionary<string, object> { { "ok", true }, { "type", "pong" } };
            else if (String.Equals(type as string, "get-form-data", StringComparison.Ordinal)) response = ReadFormData();
            else response = Error("unsupported-request");
        }
        catch { response = Error("native-host-failure"); }
        WriteMessage(output, response);
        return true;
    }

    private static object ReadFormData()
    {
        string file = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "WinPilot", "secure", "form-assistant.enc");
        if (!File.Exists(file)) return FormData(new object[0], new object[0]);
        byte[] encrypted = Convert.FromBase64String(File.ReadAllText(file, Encoding.UTF8));
        byte[] clear = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
        Dictionary<string, object> data = Json.DeserializeObject(Encoding.UTF8.GetString(clear)) as Dictionary<string, object>;
        object profiles;
        object snippets;
        if (data == null || !data.TryGetValue("profiles", out profiles)) profiles = new object[0];
        if (data == null || !data.TryGetValue("snippets", out snippets)) snippets = new object[0];
        return FormData(profiles, snippets);
    }

    private static Dictionary<string, object> FormData(object profiles, object snippets)
    {
        return new Dictionary<string, object> { { "ok", true }, { "type", "form-data" }, { "profiles", profiles }, { "snippets", snippets } };
    }

    private static Dictionary<string, object> Error(string value)
    {
        return new Dictionary<string, object> { { "ok", false }, { "error", value } };
    }

    private static byte[] ReadExact(Stream input, int length)
    {
        byte[] buffer = new byte[length];
        int offset = 0;
        while (offset < length)
        {
            int read = input.Read(buffer, offset, length - offset);
            if (read == 0)
            {
                if (offset == 0) return null;
                throw new EndOfStreamException();
            }
            offset += read;
        }
        return buffer;
    }

    private static void WriteMessage(Stream output, object value)
    {
        byte[] body = Encoding.UTF8.GetBytes(Json.Serialize(value));
        if (body.Length > MaxMessageBytes) throw new InvalidDataException("Native response is too large");
        byte[] length = BitConverter.GetBytes(body.Length);
        output.Write(length, 0, length.Length);
        output.Write(body, 0, body.Length);
        output.Flush();
    }
}
