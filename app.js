let movieData = [];
let ratingChart;

fetch('movies_info.json')
  .then(response => response.json())
  .then(data => {
    movieData = data;

    // Initialize the map
    const map = L.map('map').setView([20, 0], 2);

    // Add the tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Function to update the chart with new data
    function updateChart(chartData) {
      if (ratingChart) {
        ratingChart.destroy();
      }
      const ctx = document.getElementById('ratingChart').getContext('2d');
      ratingChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    // Load GeoJSON data for countries
    d3.json('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
    .then(geoData => {
      console.log("GeoJSON data:", geoData);

      // Add GeoJSON layer to the map
      const geoJsonLayer = L.geoJSON(geoData, {
        style: {
          weight: 1,
          color: '#3388ff',
          fillColor: '#3388ff',
          fillOpacity: 0.2
        },
        onEachFeature: (feature, layer) => {
          layer.on('click', (e) => {
            // Handle country click
            console.log('Country clicked:', feature.properties.name);

            // Process movie data for the clicked country
            const countryMovies = movieData.filter(movie => movie.countries && movie.countries.includes(feature.properties.name));
            console.log("Movies for the country:", countryMovies);
            let topRatedMovie;
            let totalRatings = 0;
            let popularGenres = {};

            countryMovies.forEach(movie => {
              if (!topRatedMovie || movie.movie_rate > topRatedMovie.movie_rate) {
                topRatedMovie = movie;
              }
              totalRatings += movie.movie_rate;
            
              if (movie.genres) { // Add this conditional check
                movie.genres.split(', ').forEach(genre => {
                  popularGenres[genre] = (popularGenres[genre] || 0) + 1;
                });
              }
            });
            

            const meanRating = totalRatings / countryMovies.length;
            const mostPopularGenre = Object.keys(popularGenres).length > 0
            ? Object.keys(popularGenres).reduce((a, b) => popularGenres[a] > popularGenres[b] ? a : b)
            : 'N/A';          

            // Calculate the count of each rating
            const ratingCounts = countryMovies.reduce((acc, movie) => {
              const rating = movie.movie_rate;
              acc[rating] = (acc[rating] || 0) + 1;
              return acc;
            }, {});     
            
            // Sort the keys (ratings) in ascending order
            const sortedRatings = Object.keys(ratingCounts).sort((a, b) => parseFloat(a) - parseFloat(b));

            // Find the minimum and maximum count values
            const minCount = Math.min(...Object.values(ratingCounts));
            const maxCount = Math.max(...Object.values(ratingCounts));

            // Normalize the count values to the range [0, 1] and then scale them to [1, 10]
            const scaledCounts = sortedRatings.map(rating => {
              const normalized = (ratingCounts[rating] - minCount) / (maxCount - minCount);
              const scaled = 1 + normalized * 9;
              // Ensure the value is a number and not NaN or null
              return isNaN(scaled) || scaled === null ? 0 : scaled;
            });

            // Create the data for the Chart.js bar chart
            const newChartData = {
              labels: sortedRatings,
              datasets: [{
                label: 'Rating Counts',
                data: scaledCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
              }]
            };


            // // Create the data for the Chart.js bar chart
            // const newChartData = {
            //   labels: Object.keys(sortedRatings),
            //   datasets: [{
            //     label: 'Rating Counts',
            //     data: sortedRatings.map(rating => ratingCounts[rating]),
            //     backgroundColor: 'rgba(75, 192, 192, 0.2)',
            //     borderColor: 'rgba(75, 192, 192, 1)',
            //     borderWidth: 1
            //   }]
            // };

            // Display the information in the modal
            $('#modalBody').html(`
              <p><strong>Country:</strong> ${feature.properties.name}</p>
              <p><strong>Top-rated movie:</strong> ${topRatedMovie.movie_title} (${topRatedMovie.movie_rate})</p>
              <p><strong>Mean value of movie ratings:</strong> ${meanRating.toFixed(2)}</p>
              <p><strong>Most popular genre:</strong> ${mostPopularGenre}</p>
              <canvas id="ratingChart" width="400" height="200"></canvas>
            `);
            updateChart(newChartData);

            // Open the Bootstrap modal
            console.log("Opening the modal...")
            $('#countryModal').modal('show');

            // Create the Chart.js bar chart after the modal is shown
            $('#countryModal').on('shown.bs.modal', function () {
              const newChartData = $(this).data('chartData');
              console.log("create the chart...")
              if (newChartData) {
                // Add a slight delay before creating the chart
                setTimeout(() => {
                  updateChart(newChartData);
                }, 1000);
              }
            });

          });
          layer.bindTooltip(feature.properties.name);
        }
      });
      geoJsonLayer.addTo(map);
      console.log("GeoJSON layer added to the map:", geoJsonLayer);
    })
  .catch(error => {
    console.error('Error fetching GeoJSON data:', error);
  });

  })
  .catch(error => {
    console.error('Error fetching movie data:', error);
  });

// Update the event listener for the modal
// $('#countryModal').on('shown.bs.modal', function () {
//   const newChartData = $(this).data('chartData');
//   console.log("create the chart...")
//   if (newChartData) {
//     // Add a slight delay before creating the chart
//     // updateChart(newChartData);
//     setTimeout(() => {
//       updateChart(newChartData);
//     }, 100);
//   }
// });
