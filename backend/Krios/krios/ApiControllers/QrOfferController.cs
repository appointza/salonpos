using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class QrOfferController : ControllerBase
    {
        ILogger<QrOfferController> logger;
        QrOfferService qrofferService;

        public QrOfferController(ILogger<QrOfferController> logger, QrOfferService qrofferService)
        {
            this.logger = logger;
            this.qrofferService = qrofferService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<QrOffer>>> Entity()
        {
            ActionRes<QrOffer> result = new ActionRes<QrOffer>()
            {
               item = new QrOffer()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<QrOffer>>>> Select(ActionReq<QrOfferSelectReq> req)
        {
            ActionRes<List<QrOffer>> result = new ActionRes<List<QrOffer>>();

            result.item = await qrofferService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<QrOffer>>> Insert(ActionReq<QrOffer> req)
        {
            ActionRes<QrOffer> result = new ActionRes<QrOffer>();

            result.item = await qrofferService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<QrOffer>>> Update(ActionReq<QrOffer> req)
        {
            ActionRes<QrOffer> result = new ActionRes<QrOffer>();

            result.item = await qrofferService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<QrOffer>>> Save(ActionReq<QrOffer> req)
        {
            ActionRes<QrOffer> result = new ActionRes<QrOffer>();

            if(req.item.id > 0){
                result.item = await qrofferService.Update(req.item);
            }else{
                result.item = await qrofferService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<QrOfferDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await qrofferService.Delete(req.item);

            return Ok(result);
        }
    }
}
