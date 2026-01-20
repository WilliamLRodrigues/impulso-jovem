const { readDB, writeDB, FILES } = require('../config/database');

// Criar avaliação
const createReview = (req, res) => {
  const reviews = readDB(FILES.reviews);
  const newReview = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  reviews.push(newReview);
  writeDB(FILES.reviews, reviews);

  // Atualizar rating do jovem apenas quando a avaliação é sobre o jovem
  const isReviewForJovem = req.body.targetType === 'jovem' || req.body.reviewerType !== 'jovem';
  if (isReviewForJovem && req.body.jovemId) {
    const jovens = readDB(FILES.jovens);
    const jovemIndex = jovens.findIndex(j => j.id === req.body.jovemId);
    if (jovemIndex !== -1) {
      const jovemReviews = reviews.filter(r => r.jovemId === req.body.jovemId && (r.targetType === 'jovem' || r.reviewerType !== 'jovem'));
      const avgRating = jovemReviews.reduce((acc, r) => acc + r.rating, 0) / jovemReviews.length;
      jovens[jovemIndex].stats.rating = avgRating;
      writeDB(FILES.jovens, jovens);
    }
  }

  res.json(newReview);
};

// Listar avaliações
const getAllReviews = (req, res) => {
  const reviews = readDB(FILES.reviews);
  const { jovemId, clientId } = req.query;

  let filtered = reviews;
  if (jovemId) filtered = filtered.filter(r => r.jovemId === jovemId);
  if (clientId) filtered = filtered.filter(r => r.clientId === clientId);

  res.json(filtered);
};

module.exports = {
  createReview,
  getAllReviews
};
