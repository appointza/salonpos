
namespace Krios.Utils
{
    public class ApplicationEnvironment
    {
        public string postgresqlconnection { get; set; } = "";
        public string jwtsecret { get; set; } = "";
        public string baseUrl { get; set; } = "";
        public ApplicationEnvironmentRedisConfigData redis { get; set; } = new();
    }

    public class ApplicationEnvironmentRedisConfigData
    {
        public string connection_string { get; set; } = "localhost:6379";
        public string instance_name { get; set; } = "Krios";
        public int default_database { get; set; }
    }
}
