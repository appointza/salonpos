using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class QrOfferRedemptionController : ControllerBase
    {
        ILogger<QrOfferRedemptionController> logger;
        QrOfferRedemptionService qrofferredemptionService;

        public QrOfferRedemptionController(ILogger<QrOfferRedemptionController> logger, QrOfferRedemptionService qrofferredemptionService)
        {
            this.logger = logger;
            this.qrofferredemptionService = qrofferredemptionService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<QrOfferRedemption>>> Entity()
        {
            ActionRes<QrOfferRedemption> result = new ActionRes<QrOfferRedemption>()
            {
               item = new QrOfferRedemption()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<QrOfferRedemption>>>> Select(ActionReq<QrOfferRedemptionSelectReq> req)
        {
            ActionRes<List<QrOfferRedemption>> result = new ActionRes<List<QrOfferRedemption>>();

            result.item = await qrofferredemptionService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<QrOfferRedemption>>> Insert(ActionReq<QrOfferRedemption> req)
        {
            ActionRes<QrOfferRedemption> result = new ActionRes<QrOfferRedemption>();

            result.item = await qrofferredemptionService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<QrOfferRedemption>>> Update(ActionReq<QrOfferRedemption> req)
        {
            ActionRes<QrOfferRedemption> result = new ActionRes<QrOfferRedemption>();

            result.item = await qrofferredemptionService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<QrOfferRedemption>>> Save(ActionReq<QrOfferRedemption> req)
        {
            ActionRes<QrOfferRedemption> result = new ActionRes<QrOfferRedemption>();

            if(req.item.id > 0){
                result.item = await qrofferredemptionService.Update(req.item);
            }else{
                result.item = await qrofferredemptionService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<QrOfferRedemptionDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await qrofferredemptionService.Delete(req.item);

            return Ok(result);
        }
    }
}
