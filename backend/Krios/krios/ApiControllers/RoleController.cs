using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoleController : ControllerBase
    {
        ILogger<RoleController> logger;
        RoleService roleService;

        public RoleController(ILogger<RoleController> logger, RoleService roleService)
        {
            this.logger = logger;
            this.roleService = roleService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Role>>> Entity()
        {
            ActionRes<Role> result = new ActionRes<Role>()
            {
               item = new Role()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Role>>>> Select(ActionReq<RoleSelectReq> req)
        {
            ActionRes<List<Role>> result = new ActionRes<List<Role>>();

            result.item = await roleService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Role>>> Insert(ActionReq<Role> req)
        {
            ActionRes<Role> result = new ActionRes<Role>();

            result.item = await roleService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Role>>> Update(ActionReq<Role> req)
        {
            ActionRes<Role> result = new ActionRes<Role>();

            result.item = await roleService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Role>>> Save(ActionReq<Role> req)
        {
            ActionRes<Role> result = new ActionRes<Role>();

            if(req.item.id > 0){
                result.item = await roleService.Update(req.item);
            }else{
                result.item = await roleService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<RoleDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await roleService.Delete(req.item);

            return Ok(result);
        }
    }
}
