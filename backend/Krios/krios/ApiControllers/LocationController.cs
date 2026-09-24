using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class LocationController : ControllerBase
    {
        ILogger<LocationController> logger;
        LocationService locationService;

        public LocationController(ILogger<LocationController> logger, LocationService locationService)
        {
            this.logger = logger;
            this.locationService = locationService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Location>>> Entity()
        {
            ActionRes<Location> result = new ActionRes<Location>()
            {
               item = new Location()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Location>>>> Select(ActionReq<LocationSelectReq> req)
        {
            ActionRes<List<Location>> result = new ActionRes<List<Location>>();

            result.item = await locationService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Location>>> Insert(ActionReq<Location> req)
        {
            ActionRes<Location> result = new ActionRes<Location>();

            result.item = await locationService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Location>>> Update(ActionReq<Location> req)
        {
            ActionRes<Location> result = new ActionRes<Location>();

            result.item = await locationService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Location>>> Save(ActionReq<Location> req)
        {
            ActionRes<Location> result = new ActionRes<Location>();

            if(req.item.id > 0){
                result.item = await locationService.Update(req.item);
            }else{
                result.item = await locationService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<LocationDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await locationService.Delete(req.item);

            return Ok(result);
        }
    }
}
