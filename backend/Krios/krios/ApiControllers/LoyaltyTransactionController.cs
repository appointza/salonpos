using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class LoyaltyTransactionController : ControllerBase
    {
        ILogger<LoyaltyTransactionController> logger;
        LoyaltyTransactionService loyaltytransactionService;

        public LoyaltyTransactionController(ILogger<LoyaltyTransactionController> logger, LoyaltyTransactionService loyaltytransactionService)
        {
            this.logger = logger;
            this.loyaltytransactionService = loyaltytransactionService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<LoyaltyTransaction>>> Entity()
        {
            ActionRes<LoyaltyTransaction> result = new ActionRes<LoyaltyTransaction>()
            {
               item = new LoyaltyTransaction()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<LoyaltyTransaction>>>> Select(ActionReq<LoyaltyTransactionSelectReq> req)
        {
            ActionRes<List<LoyaltyTransaction>> result = new ActionRes<List<LoyaltyTransaction>>();

            result.item = await loyaltytransactionService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<LoyaltyTransaction>>> Insert(ActionReq<LoyaltyTransaction> req)
        {
            ActionRes<LoyaltyTransaction> result = new ActionRes<LoyaltyTransaction>();

            result.item = await loyaltytransactionService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<LoyaltyTransaction>>> Update(ActionReq<LoyaltyTransaction> req)
        {
            ActionRes<LoyaltyTransaction> result = new ActionRes<LoyaltyTransaction>();

            result.item = await loyaltytransactionService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<LoyaltyTransaction>>> Save(ActionReq<LoyaltyTransaction> req)
        {
            ActionRes<LoyaltyTransaction> result = new ActionRes<LoyaltyTransaction>();

            if(req.item.id > 0){
                result.item = await loyaltytransactionService.Update(req.item);
            }else{
                result.item = await loyaltytransactionService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<LoyaltyTransactionDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await loyaltytransactionService.Delete(req.item);

            return Ok(result);
        }
    }
}
