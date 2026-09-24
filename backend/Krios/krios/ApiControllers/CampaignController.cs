using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class CampaignController : ControllerBase
    {
        ILogger<CampaignController> logger;
        CampaignService campaignService;

        public CampaignController(ILogger<CampaignController> logger, CampaignService campaignService)
        {
            this.logger = logger;
            this.campaignService = campaignService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Campaign>>> Entity()
        {
            ActionRes<Campaign> result = new ActionRes<Campaign>()
            {
               item = new Campaign()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Campaign>>>> Select(ActionReq<CampaignSelectReq> req)
        {
            ActionRes<List<Campaign>> result = new ActionRes<List<Campaign>>();

            result.item = await campaignService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Campaign>>> Insert(ActionReq<Campaign> req)
        {
            ActionRes<Campaign> result = new ActionRes<Campaign>();

            result.item = await campaignService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Campaign>>> Update(ActionReq<Campaign> req)
        {
            ActionRes<Campaign> result = new ActionRes<Campaign>();

            result.item = await campaignService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Campaign>>> Save(ActionReq<Campaign> req)
        {
            ActionRes<Campaign> result = new ActionRes<Campaign>();

            if(req.item.id > 0){
                result.item = await campaignService.Update(req.item);
            }else{
                result.item = await campaignService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<CampaignDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await campaignService.Delete(req.item);

            return Ok(result);
        }
    }
}
